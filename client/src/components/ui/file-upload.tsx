import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FileUploadProps {
  onChange: (file: File | null) => void;
  value?: File | string | null;
  className?: string;
  showPreview?: boolean;
  accept?: string;
  maxSizeMB?: number;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onChange,
  value,
  className,
  showPreview = true,
  accept = "image/*",
  maxSizeMB = 5
}) => {
  const [preview, setPreview] = useState<string | null>(
    typeof value === 'string' ? value : null
  );
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setError(null);
    
    if (file) {
      // Check file size
      const fileSizeMB = file.size / (1024 * 1024);
      if (fileSizeMB > maxSizeMB) {
        setError(`File is too large. Maximum size is ${maxSizeMB}MB.`);
        return;
      }

      // Create preview
      if (showPreview) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreview(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    } else {
      setPreview(null);
    }
    
    onChange(file);
  };

  const handleClearFile = () => {
    onChange(null);
    setPreview(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCameraCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className={cn("flex flex-col space-y-2", className)}>
      <div className="flex flex-col items-center justify-center">
        {showPreview && preview && (
          <div className="relative mb-3">
            <img 
              src={preview} 
              alt="Preview" 
              className="rounded-md object-cover h-48 w-auto" 
            />
            <Button 
              type="button"
              size="icon"
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleClearFile}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {!preview && (
          <div className="flex justify-center gap-2 w-full">
            <Button 
              type="button"
              variant="outline"
              onClick={handleCameraCapture}
              className="flex items-center gap-2"
            >
              <Camera className="h-4 w-4" />
              <span>Take Photo</span>
            </Button>

            <Button 
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              <span>Upload</span>
            </Button>
          </div>
        )}

        <input
          type="file"
          accept={accept}
          onChange={handleFileChange}
          className="hidden"
          ref={fileInputRef}
          capture="environment"
        />
      </div>

      {error && (
        <p className="text-sm text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
};

export { FileUpload };