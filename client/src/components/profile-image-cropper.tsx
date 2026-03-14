import React, { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader } from "lucide-react";

interface ProfileImageCropperProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File, crop: any, nudge: any) => void;
}

export default function ProfileImageCropper({
  open,
  onClose,
  onCropComplete,
}: ProfileImageCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [originalFile, setOriginalFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];

      // Validate file
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        alert(`Invalid file type: ${file.type}. Please use JPEG, PNG, GIF, or WebP.`);
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        alert("File is too large. Maximum size is 10MB.");
        return;
      }

      // Store the original file
      setOriginalFile(file);

      // Read file as data URL for preview
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
      };
      reader.onerror = () => {
        alert("Failed to read file");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  /**
   * Convert canvas to Blob (async)
   */
  const canvasToBlob = (canvas: HTMLCanvasElement): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        },
        "image/jpeg",
        0.9 // Quality
      );
    });
  };

  /**
   * Create cropped image file from canvas
   */
  const createCroppedFile = async (): Promise<File> => {
    if (!imageSrc || !croppedAreaPixels || !canvasRef.current) {
      throw new Error("Missing required data for cropping");
    }

    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = imageSrc;
      image.onload = async () => {
        try {
          const canvas = canvasRef.current!;
          const ctx = canvas.getContext("2d");

          if (!ctx) {
            throw new Error("Failed to get canvas context");
          }

          // Set canvas size to match cropped area
          const { width, height } = croppedAreaPixels;
          canvas.width = width;
          canvas.height = height;

          // Draw the cropped portion
          ctx.drawImage(
            image,
            croppedAreaPixels.x,
            croppedAreaPixels.y,
            croppedAreaPixels.width,
            croppedAreaPixels.height,
            0,
            0,
            croppedAreaPixels.width,
            croppedAreaPixels.height
          );

          // Convert canvas to blob
          const blob = await canvasToBlob(canvas);

          // Create File from Blob
          const timestamp = Date.now();
          const file = new File(
            [blob],
            `profile-${timestamp}.jpg`,
            { type: "image/jpeg" }
          );

          console.log("✅ Cropped file created:", {
            name: file.name,
            size: file.size,
            type: file.type,
          });

          resolve(file);
        } catch (error) {
          console.error("❌ Error creating cropped file:", error);
          reject(error);
        }
      };
      image.onerror = () => {
        reject(new Error("Failed to load image"));
      };
    });
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) {
      alert("Please crop an image first");
      return;
    }

    setIsSaving(true);
    try {
      console.log("🖼️ Creating cropped file...");

      // Create the actual cropped file
      const croppedFile = await createCroppedFile();

      console.log("📤 Passing to onCropComplete");

      // Pass the file and crop data
      onCropComplete(croppedFile, croppedAreaPixels, { dx: crop.x, dy: crop.y });

      // Reset and close
      setImageSrc(null);
      setOriginalFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      onClose();
    } catch (error) {
      console.error("❌ Error saving cropped image:", error);
      alert(
        error instanceof Error
          ? error.message
          : "Failed to process image"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    // Reset state
    setImageSrc(null);
    setOriginalFile(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload & Crop Profile Picture</DialogTitle>
        </DialogHeader>

        {/* Hidden canvas for cropping */}
        <canvas ref={canvasRef} style={{ display: "none" }} />

        <div className="space-y-4">
          {/* File Input */}
          {!imageSrc && (
            <div className="border-2 border-dashed border-muted-foreground rounded-lg p-6 text-center cursor-pointer hover:bg-muted transition"
              onClick={() => inputRef.current?.click()}
            >
              <input
                type="file"
                accept="image/*"
                ref={inputRef}
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <p className="text-muted-foreground">
                Click to select an image (JPEG, PNG, GIF, or WebP)
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Maximum file size: 10MB
              </p>
            </div>
          )}

          {/* Image Cropper */}
          {imageSrc && (
            <>
              <div className="relative w-full bg-muted rounded-lg overflow-hidden"
                style={{ height: "400px" }}
              >
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                  classes={{
                    containerClassName: "relative w-full h-full",
                  }}
                />
              </div>

              {/* Zoom Slider */}
              <div className="flex items-center gap-4">
                <span className="text-sm font-medium">Zoom:</span>
                <Slider
                  min={1}
                  max={3}
                  step={0.01}
                  value={[zoom]}
                  onValueChange={(v) => setZoom(v[0])}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-12">
                  {(zoom * 100).toFixed(0)}%
                </span>
              </div>

              {/* Info Text */}
              <p className="text-xs text-muted-foreground">
                Drag to move, scroll to zoom. Image will be cropped to a square.
              </p>
            </>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={isSaving}>
              Cancel
            </Button>
            {imageSrc && (
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Save & Upload"
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}