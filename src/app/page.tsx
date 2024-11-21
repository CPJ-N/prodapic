"use client"

import React, { useState, useCallback, useEffect } from 'react';
import Image from "next/image";
import { SignInButton, useUser } from "@clerk/nextjs";
import { Upload, RefreshCw, Download, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { removeBackground } from '@imgly/background-removal';
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import Footer from '@/components/ui/Footer';

const BACKGROUND_PRESETS = {
  product: {
    suggestions: [
      "Minimalist studio background with soft lighting",
      "Textured luxury marble surface with no objects",
      "Plain white background with subtle natural shadows",
      "Soft gradient background using neutral tones",
      "Smooth gradient background with brand colors",
      "Glass-like reflective surface with a clean background"
    ]
  },
  lifestyle: {
    suggestions: [
      "Cozy coffee shop corner with a blurred table area",
      "Modern kitchen backdrop with clean lines and neutral tones",
      "Bright living room decor with a focus on the walls",
      "Outdoor cafe terrace with warm ambient lighting",
      "Contemporary office space with clean, empty surfaces",
      "Stylish restaurant interior without furniture focus"
    ]
  },
  seasonal: {
    suggestions: [
      "Festive holiday decorations in the background, no objects",
      "Serene summer beach scene with soft waves and sand",
      "Autumn nature background with falling leaves",
      "Spring garden view with blooming flowers and greenery",
      "Winter snowy scene with a frosty effect",
      "Subtle Valentine's Day theme with soft pink hues"
    ]
  }
};

const BASE_CONTEXT = {
  product: 
    "Generate a clean and professional background designed for product display. The background should have no objects, focusing only on smooth gradients, plain colors, or subtle textures. Avoid including any products or distractions in the scene, ensuring a polished and neutral setup.",
  
  lifestyle: 
    "Create a lifestyle-themed background that is clean and inviting, with no objects in the frame. Focus on the environment, such as walls, surfaces, or ambient settings, while maintaining a modern and elegant look. Avoid adding specific items like furniture or accessories, keeping the background neutral and versatile.",
  
  seasonal: 
    "Design a seasonal-themed background that represents the chosen season without adding any objects. Use colors, textures, and minimal design elements to evoke the season’s essence, such as soft pastels for spring, warm tones for autumn, or cool blues for winter. Keep the background simple and distraction-free."
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
  const [processing, setProcessing] = useState({ step: '', progress: 0 });
  const [backgroundPrompt, setBackgroundPrompt] = useState('');
  const [selectedPreset, setSelectedPreset] = useState<keyof typeof BACKGROUND_PRESETS>('product');
  const [generatedImage, setGeneratedImage] = useState("");
  const [combinedImage, setCombinedImage] = useState<string | null>(null);
  const [hasCombined, setHasCombined] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState(3);
  const [userAPIKey, setUserAPIKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userAPIKey") || "";
    }
    return "";
  });

  const handleAPIKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUserAPIKey(newValue);
    localStorage.setItem("userAPIKey", newValue);
  };

  const generateBg = useCallback(async () => {
    if (!isSignedIn) {
      return;
    }
    console.log(isSignedIn);

    const enhancedPrompt = generateEnhancedPrompt(backgroundPrompt, selectedPreset);
    console.log('Starting image generation with enhanced prompt:', enhancedPrompt);
      
    const res = await fetch("/api/generateBg", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ 
        prompt: enhancedPrompt, 
        userAPIKey, 
      }),
    });

    try{
      if (res.ok) {
        const json = await res.json();
        setGeneratedImage(`data:image/png;base64,${json.b64_json}`);
        await user.reload();
        setHasCombined(false);
        return `data:image/png;base64,${json.b64_json}`
      } else if (res.headers.get("Content-Type") === "text/plain") {
        toast({
          variant: "destructive",
          title: res.statusText,
          description: await res.text(),
        });
        setError('Failed to generate background: ' + res.statusText);
        return ''
      } else {
        toast({
          variant: "destructive",
          title: "Whoops!",
          description: `There was a problem processing your request: ${res.statusText}`,
        });
        setError( `There was a problem processing your request: ${res.statusText}`);
        return ''
      }
    } catch (error) {
      console.error('Failed to generate background:', error);
      if (error instanceof Error) {
        setError('Failed to generate background: ' + error.message);
      } else {
        setError('Failed to generate background');
      }
    }
  }, [backgroundPrompt, selectedPreset, userAPIKey, user, isSignedIn]);

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
        const base64Image = reader.result as string;
        setOriginalImage(base64Image);
        setProcessedImage(null);
        setError('');
        console.log('Image upload completed');

        if (base64Image) {
          try {
            console.log('Starting background removal...');
            const processedBlob = await removeBackground(base64Image);
            const removeBgImage = await new Promise<string | null>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string | null);
              reader.readAsDataURL(processedBlob);
            });
            setProcessedImage(removeBgImage);
            console.log('Background removal completed ', processedImage);
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

      setHasCombined(false); // Reset the flag when a new image is uploaded
    }
  }, [processedImage]);

  // Add this function to combine images
  const combineImages = useCallback(async () => {
    console.log('Starting image combination process...');

    if (!processedImage || !generatedImage) {
      console.warn('Missing images:', { 
        hasProcessedImage: !!processedImage, 
        hasGeneratedImage: !!generatedImage 
      });
      toast({
        title: "Error",
        description: "Both processed and generated images are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      console.log('Canvas context created');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Create new images
      const bgImage = new window.Image();
      const fgImage = new window.Image();
      
      // Wait for both images to load
      await new Promise<void>((resolve, reject) => {
        bgImage.onload = () => {
          console.log('Background image loaded:', {
            width: bgImage.width,
            height: bgImage.height
          });

          // Set canvas dimensions to match the background image
          canvas.width = bgImage.width;
          canvas.height = bgImage.height;

          // Draw background to cover the entire canvas
          ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
          console.log('Background drawn to canvas');

          fgImage.onload = () => {
            console.log('Foreground image loaded:', {
              width: fgImage.width,
              height: fgImage.height
            });

            // Calculate foreground image dimensions to contain it within the canvas
            const fgAspect = fgImage.width / fgImage.height;
            const canvasAspect = canvas.width / canvas.height;

            let fgWidth, fgHeight;
            if (fgAspect > canvasAspect) {
              // Foreground is wider relative to canvas
              fgWidth = canvas.width * 0.5; // Adjust scaling factor as needed
              fgHeight = fgWidth / fgAspect;
            } else {
              // Foreground is taller relative to canvas
              fgHeight = canvas.height * 0.5; // Adjust scaling factor as needed
              fgWidth = fgHeight * fgAspect;
            }

            // Center the foreground image on the canvas
            const fgX = (canvas.width - fgWidth) / 2;
            const fgY = (canvas.height - fgHeight) / 2;

            ctx.drawImage(fgImage, fgX, fgY, fgWidth, fgHeight);
            console.log('Foreground drawn to canvas');
            resolve();
          };

          fgImage.onerror = () => reject(new Error('Failed to load foreground image'));
          fgImage.src = processedImage;
        };

        bgImage.onerror = () => reject(new Error('Failed to load background image'));
        bgImage.src = generatedImage;
      });

      const result = canvas.toDataURL('image/png');
      console.log('Images combined successfully');
      setHasCombined(true); // Set the flag to true after combining
      setCombinedImage(result);
      return result;
    } catch (error) {
      console.error('Failed to combine images:', error);
      toast({
        title: "Error",
        description: "Failed to combine images",
        variant: "destructive",
      });
    }
  }, [processedImage, generatedImage]);


  const processImage = useCallback(async () => {
  
    try {
      setLoading(true);
      setError('');

      // Step 1: Remove background
      setProcessing({ step: 'Removing background...', progress: 25 });

      // Step 2: Generate background
      setProcessing({ step: 'Generating new background...', progress: 50 });
      await generateBg()
      console.log('Background Generated', generatedImage)
        // Step 3: Combine images
      setProcessing({ step: '', progress: 75 });

      setProcessing({ step: 'Complete!', progress: 100 });
      // setRemainingCredits(prev => prev - 1);
    } catch (error) {
      console.error('Process failed:', error);
      if (error instanceof Error) {
        setError('Failed to process image: ' + error.message);
      } else {
        setError('Failed to process image');
      }
    } finally {
      setLoading(false);
    }
  }, [ generatedImage, generateBg]);

  useEffect(() => {
    // Only call combineImages if both images are available and not combined yet
    if (processedImage && generatedImage && !hasCombined) {
      combineImages();
    }

    console.log(window.location.href)
    console.log(`Credits Remaining: ${user?.unsafeMetadata.remaining ?? 3}`)
    setRemainingCredits(user?.unsafeMetadata.remaining as number ?? 3);
  }, [processedImage, generatedImage, hasCombined, combineImages, remainingCredits, user]);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="flex justify-center mb-8">
        <Image
          src="/prodapic-logo-cropped-no-bg.png"
          alt="Logo"
          width={400}
          height={200}
          className="object-contain"
        />
      </div>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Product Photo Enhancer</h1>
          <p className="text-gray-600">Transform your product photos with AI-generated backgrounds</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Main Upload Section */}
          <Card>
            <CardHeader>
              <CardTitle>Original Image</CardTitle>
              <CardDescription>Upload your product photo</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative"> {/* Added wrapper for overlay positioning */}
                <div className="flex flex-col items-center gap-4">
                  {originalImage ? (
                    <div className="relative w-full h-64">
                      <Image
                        src={originalImage}
                        alt="Original product"
                        fill
                        priority
                        className={`${loading ? "animate-pulse" : ""} max-w-full rounded-lg object-contain shadow-sm shadow-black`}
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
                </div>

                {/* Authentication Overlay - Covers entire upload section */}
                {isLoaded && !isSignedIn && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-lg z-50"
                  >
                    <div className="rounded-lg bg-gray-200 p-6 text-gray-900 max-w-sm w-full mx-4">
                      <p className="text-lg font-medium text-center">
                        Create a free account to enhance your product photos:
                      </p>
                      <div className="mt-6">
                        <SignInButton
                          mode="modal"
                          signUpForceRedirectUrl={window.location.href}
                          forceRedirectUrl={window.location.href}
                        >
                          <Button
                            size="lg"
                            className="w-full text-base font-semibold bg-[#0078D7] hover:bg-[#0078D7]/90 text-white"
                          >
                            Sign in
                          </Button>
                        </SignInButton>
                      </div>
                    </div>
                  </motion.div>
                )}

                {!processedImage && originalImage && (
                  <p className="text-gray-500 text-sm italic mt-2 text-center">
                    Waiting for image to process...
                  </p>
                )}

                {/* API Key Section */}
                <div className="p-4 mt-20">
                <Card>
                <CardHeader>
                  <CardTitle>
                    TOGETHER API KEY
                    <span className="ml-2 text-xs uppercase text-[#6F6F6F]">
                      [OPTIONAL]
                    </span>
                  </CardTitle>
                  
                    <CardDescription>
                      Please enter your API key from Together.ai to use this tool. No rate limiting with your own API key!
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                  <Input
                    value={userAPIKey}
                    onChange={handleAPIKeyChange}
                    placeholder="API Key"
                    type="password"
                  />
                  </CardContent>
                  </Card>
                </div>
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
                    src={combinedImage || processedImage || '/image.png'}
                    alt="Generated background"
                    fill
                    priority
                    className={`${loading ? "animate-pulse" : ""} max-w-full rounded-lg object-cover shadow-sm shadow-black`}
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
                      disabled={!originalImage || loading || !backgroundPrompt.trim() || !processedImage || remainingCredits <= 1}
                      className="flex-1"
                      style={{ backgroundColor: '#0078D7' }}
                    >
                      {loading ? (
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        'Generate Background'
                      )}
                    </Button>
                    
                    {combinedImage && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          console.log('Starting image download');
                          const link = document.createElement('a');
                          link.href = combinedImage;
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

        {/* Alerts */}
        <div className="mt-6 space-y-6">

          {/* Credits Alert */}
          <Alert variant={ remainingCredits <= 1 ? "destructive" : "default"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Credits Remaining</AlertTitle>
            <AlertDescription>
              You have {remainingCredits <= 1 ? 'no': `${remainingCredits - 1}`} background generation{(user?.unsafeMetadata.remaining ?? 3) !== 1 ? 's' : ''} remaining this month.
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
                    {processedImage && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          console.log('Starting image download');
                          const link = document.createElement('a');
                          link.href = processedImage;
                          link.download = 'removed-bg.jpg';
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          console.log('Image download initiated');
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                </CardHeader>
                <CardContent>
                  <div className="relative w-full h-64 bg-gray-50 rounded-lg overflow-hidden">
                    <Image
                      src={processedImage || '/image.png'}
                      alt="Background Removed"
                      fill
                      priority
                      className={`${loading ? "animate-pulse" : ""} max-w-full rounded-lg object-contain shadow-sm shadow-black`}
                      sizes="max-w-full rounded-lg object-cover shadow-sm shadow-black"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
            
            {(generatedImage || originalImage) && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Generated Background</CardTitle>
                  <CardDescription>Generated using Together AI</CardDescription>
                  {generatedImage && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        console.log('Starting image download');
                        const link = document.createElement('a');
                        link.href = generatedImage;
                        link.download = 'generated-bg.jpg';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        console.log('Image download initiated');
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="mt-4 flex w-full flex-col justify-center">
                    <div>
                      <Image
                        placeholder="blur"
                        blurDataURL={'/image.png'}
                        width={1024}
                        height={768}
                        src={generatedImage || '/image.png'}
                        alt="AI Generated Background"
                        className={`${loading ? "animate-pulse" : ""} max-w-full rounded-lg object-contain shadow-sm shadow-black`}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductEnhancer;