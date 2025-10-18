import React, { useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";

interface ProfileImageCropperProps {
  open: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File, crop: any, nudge: any) => void;
}

export default function ProfileImageCropper({ open, onClose, onCropComplete }: ProfileImageCropperProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = () => setImageSrc(reader.result as string);
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleCropComplete = (_: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    // Convert cropped area to a file (send crop/nudge to backend instead for real use)
    // Here, just pass crop/nudge data
    const fakeFile = new File([imageSrc], "profile.jpg", { type: "image/jpeg" });
    onCropComplete(fakeFile, croppedAreaPixels, { dx: crop.x, dy: crop.y });
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload & Crop Profile Picture</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!imageSrc && (
            <input type="file" accept="image/*" ref={inputRef} onChange={handleFileChange} />
          )}
          {imageSrc && (
            <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={handleCropComplete}
              />
            </div>
          )}
          {imageSrc && (
            <div className="flex items-center gap-4">
              <span>Zoom</span>
              <Slider min={1} max={3} step={0.01} value={[zoom]} onValueChange={v => setZoom(v[0])} />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            {imageSrc && <Button onClick={handleSave}>Save</Button>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
