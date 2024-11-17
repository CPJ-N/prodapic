"use client"

import React, { useState, useCallback, useEffect } from 'react';
import Image from "next/image";
import { useUser } from '@clerk/nextjs';
import { Upload, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { useQuery } from '@tanstack/react-query';
import { useDebounce } from "@uidotdev/usehooks";
import { removeBackground } from '@imgly/background-removal';
import { toast } from "@/hooks/use-toast";

const BACKGROUND_PRESETS = {
  product: {
    suggestions: [
      "Modern minimalist studio setup",
      "Luxury marble countertop",
      "Clean white background with soft shadows",
      "Professional photography studio lighting",
      "Gradient background with brand colors",
      "Sleek glass display surface"
    ]
  },
  lifestyle: {
    suggestions: [
      "Cozy coffee shop interior",
      "Modern kitchen scene",
      "Stylish living room setting",
      "Outdoor cafe terrace",
      "Contemporary office space",
      "Trendy restaurant interior"
    ]
  },
  seasonal: {
    suggestions: [
      "Festive holiday decoration setup",
      "Summer beach scene",
      "Autumn nature background",
      "Spring garden setting",
      "Winter wonderland scene",
      "Valentine's day themed backdrop"
    ]
  }
};

const BASE_CONTEXT = {
  product: "Create a professional product photography background that is",
  lifestyle: "Generate a lifestyle scene background that is",
  seasonal: "Design a seasonal themed environment that is"
};

const generateEnhancedPrompt = (
  basePrompt: string, 
  preset: keyof typeof BACKGROUND_PRESETS,
  productContext: boolean = true
) => {
  const context = BASE_CONTEXT[preset];
  const enhancedPrompt = `${context} ${basePrompt.toLowerCase()}${
    productContext ? ". Ensure the background complements product photography with appropriate lighting and depth." : ""
  }`;
  console.log('Enhanced prompt generated:', enhancedPrompt);
  return enhancedPrompt;
};


const ProductEnhancer = () => {
  const { isSignedIn, isLoaded, user } = useUser();
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [remainingCredits, setRemainingCredits] = useState(3);
  const [processing, setProcessing] = useState({ step: '', progress: 0 });
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof BACKGROUND_PRESETS>('product');
  const [iterativeMode, setIterativeMode] = useState(false);
  const [userAPIKey, setUserAPIKey] = useState("");
  const debouncedPrompt = useDebounce(backgroundPrompt, 300);
  const [generations, setGenerations] = useState<{ prompt: string; image: any }[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>();
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");

  const { data: image, isFetching } = useQuery({
    placeholderData: (previousData) => {
      console.log('Using placeholder data:', previousData);
      return previousData || { base64: '/image.png' };
    },
    queryKey: [debouncedPrompt, selectedPreset],
    queryFn: async () => {
      const enhancedPrompt = generateEnhancedPrompt(backgroundPrompt, selectedPreset);
      console.log('Starting image generation with enhanced prompt:', enhancedPrompt);
      
      let res = await fetch("/api/generateImages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt: enhancedPrompt, 
          userAPIKey, 
          iterativeMode 
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Image generation failed:', errorText);
        throw new Error(errorText);
      }
      
      const data = await res.json();
      console.log('Image generation successful');
      return data;
    },
    enabled: !!debouncedPrompt.trim(),
    staleTime: Infinity,
    retry: false,
  });

  async function generateImage() {
    if (!isSignedIn) {
      return;
    }

    setIsLoading(true);
    const enhancedPrompt = generateEnhancedPrompt(backgroundPrompt, selectedPreset);
    console.log('Starting image generation with enhanced prompt:', enhancedPrompt);
      
    const res = await fetch("/api/generateImages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        prompt: enhancedPrompt, 
        userAPIKey, 
        iterativeMode 
      }),
    });

    if (res.ok) {
      const json = await res.json();
      setGeneratedImage(`data:image/png;base64,${json.b64_json}`);
      await user.reload();
    } else if (res.headers.get("Content-Type") === "text/plain") {
      toast({
        variant: "destructive",
        title: res.statusText,
        description: await res.text(),
      });
    } else {
      toast({
        variant: "destructive",
        title: "Whoops!",
        description: `There was a problem processing your request: ${res.statusText}`,
      });
    }

    setIsLoading(false);
  }

  useEffect(() => {
    console.log('Effect triggered:', { 
      hasImage: !!image, 
      generationsCount: generations.length,
      activeIndex 
    });
    
    if (image && !generations.map((g) => g.image).includes(image)) {
      console.log('Adding new generation to history');
      setGenerations((images) => [...images, { prompt: backgroundPrompt, image }]);
      setActiveIndex(generations.length);
      setProcessedImage(`data:image/jpeg;base64,${image.base64}`);
    }
  }, [generations, image, backgroundPrompt]);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      console.log('Image upload started:', {
        fileName: file.name,
        fileSize: `${(file.size / 1024).toFixed(2)}KB`,
        fileType: file.type
      });

      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result as string | null;
        setOriginalImage(base64Image);
        setProcessedImage(null);
        setError('');
        console.log('Image upload completed');

        if (base64Image) {
          try {
            const processedBlob = await removeBackground(base64Image);
            const processedImage = await new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string | null);
              reader.readAsDataURL(processedBlob);
            });
            setProcessedImage(processedImage);
            console.log('Background removal completed');
          } catch (error) {
            console.error('Error removing background:', error);
            setError('Failed to remove background. Please try again.');
          }
        }
      };

      reader.onerror = (error) => {
        console.error('Error reading file:', error);
        setError('Failed to read image file. Please try again.');
      };

      reader.readAsDataURL(file);
    }
  }, []);

  const processImage = useCallback(async () => {
    if (!originalImage || remainingCredits <= 0 || !backgroundPrompt.trim()) {
      console.warn('Process image cancelled:', {
        hasOriginalImage: !!originalImage,
        remainingCredits,
        hasPrompt: !!backgroundPrompt.trim()
      });
      return;
    }

    console.log('Starting image processing', {
      prompt: backgroundPrompt
    });
    setLoading(true);
    setError('');
    setProcessing({ step: 'Removing background...', progress: 25 });

    try {
      console.log('Step 1: Removing background');
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessing({ step: 'Generating new background...', progress: 50 });
      console.log('Step 2: Generating new background with prompt:', backgroundPrompt);
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setProcessing({ step: 'Complete!', progress: 100 });
      setRemainingCredits(prev => prev - 1);
      console.log('Image processing completed successfully');
    } catch (err) {
      console.error('Image processing failed:', err);
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
      console.log('Processing finished. Credits remaining:', remainingCredits - 1);
    }
  }, [originalImage, remainingCredits, backgroundPrompt]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Product Photo Enhancer</h1>
          <p className="text-gray-600">Transform your product photos with AI-generated backgrounds</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Original Image</CardTitle>
              <CardDescription>Upload your product photo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                {originalImage ? (
                  <div className="relative w-full h-64">
                    <Image
                      src={originalImage}
                      alt="Original product"
                      fill
                      priority
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                ) : (
                  <label className="w-full h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">Click to upload or drag and drop</p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                  </label>
                )}
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Result Section */}
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Result</CardTitle>
              <CardDescription>
                {loading ? processing.step : 'Your enhanced product photo'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="relative w-full h-64 bg-gray-50 rounded-lg">
                  <Image
                    src={processedImage || '/image.png'}
                    alt="Generated background"
                    fill
                    priority
                    className="object-contain"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  {loading && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full max-w-xs">
                        <Progress value={processing.progress} className="w-full" />
                        <p className="text-sm text-gray-600 mt-2 text-center">{processing.step}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col gap-4 w-full">
                  <div className="space-y-2">
                    <label htmlFor="prompt" className="text-sm text-gray-600">
                      Describe the background you want
                    </label>
                    <div className="space-y-4">
                      <Input
                        id="prompt"
                        placeholder="e.g., A minimalist white studio background with soft shadows"
                        value={backgroundPrompt}
                        onChange={(e) => setBackgroundPrompt(e.target.value)}
                        disabled={loading}
                      />
                      
                      <div className="space-y-2">
                        <div className="flex justify-center gap-2">
                          {Object.keys(BACKGROUND_PRESETS).map((preset) => (
                            <Button
                              key={preset}
                              variant={selectedPreset === preset ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                console.log('Preset selected:', preset);
                                setSelectedPreset(preset as keyof typeof BACKGROUND_PRESETS);
                              }}
                              className={`text-xs min-w-[100px] ${
                                selectedPreset === preset 
                                  ? 'bg-[#0078D7] hover:bg-[#0078D7]/90' 
                                  : 'text-[#00A4EF] border-[#00A4EF] hover:bg-[#00A4EF]/10'
                              }`}
                            >
                              {preset.charAt(0).toUpperCase() + preset.slice(1)}
                            </Button>
                          ))}
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          {BACKGROUND_PRESETS[selectedPreset].suggestions.map((suggestion, index) => (
                            <Button
                              key={index}
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const suggestion = BACKGROUND_PRESETS[selectedPreset].suggestions[index];
                                console.log('Suggestion selected:', suggestion);
                                setBackgroundPrompt(suggestion);
                              }}
                              className="text-xs bg-white hover:bg-gray-50"
                            >
                              {suggestion}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 w-full">
                    <Button
                      onClick={processImage}
                      disabled={!originalImage || loading || remainingCredits <= 0 || !backgroundPrompt.trim()}
                      className="flex-1"
                      style={{ backgroundColor: '#0078D7' }}
                    >
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        'Generate Background'
                      )}
                    </Button>
                    
                    {processedImage && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          console.log('Starting image download');
                          const link = document.createElement('a');
                          link.href = processedImage;
                          link.download = 'enhanced-product.jpg';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          console.log('Image download initiated');
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Credits and Alerts */}
        <div className="mt-6 space-y-6">
          {/* Credits Alert */}
          <Alert variant={remainingCredits <= 1 ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credits Remaining</AlertTitle>
            <AlertDescription>
              You have {remainingCredits} background generation{remainingCredits !== 1 ? 's' : ''} remaining this month.
            </AlertDescription>
          </Alert>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Processed Images Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {(processedImage || originalImage) && (
              <Card>
                <CardHeader>
                  <CardTitle>Background Removed</CardTitle>
                  <CardDescription>Original image with background removed</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-64 bg-gray-50 rounded-lg overflow-hidden">
                    <Image
                      src={processedImage || '/image.png'}
                      alt="Background Removed"
                      fill
                      priority
                      className="object-contain"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {(image || originalImage) && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Generated Background</CardTitle>
                  <CardDescription>Generated using Together AI</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="mt-4 flex w-full flex-col justify-center">
                  {generations.map((generatedImage, i) => (
                    <div key={i}>
                      <Image
                        placeholder="blur"
                        blurDataURL={'/image.png'}
                        width={1024}
                        height={768}
                        src={`data:image/png;base64,${generatedImage.image.b64_json }`}
                        alt="AI Generated Background"
                        className={`${isFetching ? "animate-pulse" : ""} max-w-full rounded-lg object-cover shadow-sm shadow-black`}
                      />
                    </div>
                    ))}

                    <div className="mt-4 flex gap-4 overflow-x-scroll pb-4">
                      {generations.map((generation, i) => (
                        <button
                          key={i}
                          className={`w-32 shrink-0 ${
                            activeIndex === i ? 'opacity-100' : 'opacity-50 hover:opacity-100'
                          }`}
                          onClick={() => setActiveIndex(i)}
                        >
                          <Image
                            placeholder="blur"
                            blurDataURL={'/image.png'}
                            width={1024}
                            height={768}
                            src={`data:image/png;base64,${generation.image.base64}`}
                            alt={`Generation ${i + 1}`}
                            className="max-w-full rounded-lg object-cover shadow-sm shadow-black"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEnhancer;