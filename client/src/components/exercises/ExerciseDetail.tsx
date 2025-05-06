import React from "react";
import {
  AdaptiveDialog,
  AdaptiveDialogContent,
  AdaptiveDialogDescription,
  AdaptiveDialogHeader,
  AdaptiveDialogTitle,
} from "@/components/ui/adaptive-dialog";
import { Badge } from "@/components/ui/badge";

interface Exercise {
  id: number;
  name: string;
  description: string;
  muscleGroup: string;
  difficulty: string;
  videoUrl?: string;
  imageUrl?: string;
  instructions: string;
}

interface ExerciseDetailProps {
  exercise: Exercise | null;
  isOpen: boolean;
  onClose: () => void;
}

const ExerciseDetail: React.FC<ExerciseDetailProps> = ({
  exercise,
  isOpen,
  onClose,
}) => {
  if (!exercise) return null;

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-500";
      case "intermediate":
        return "bg-yellow-500";
      case "advanced":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  
  // Helper function to capitalize difficulty levels for display
  const formatDifficulty = (difficulty: string): string => {
    return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  };

  return (
    <AdaptiveDialog open={isOpen} onOpenChange={onClose}>
      <AdaptiveDialogContent className="sm:max-w-3xl max-h-[80vh] md:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
        <AdaptiveDialogHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <AdaptiveDialogTitle className="text-xl sm:text-2xl">{exercise.name}</AdaptiveDialogTitle>
            <Badge className={`${getDifficultyColor(exercise.difficulty)} text-xs whitespace-nowrap`}>
              {formatDifficulty(exercise.difficulty)}
            </Badge>
          </div>
          <AdaptiveDialogDescription className="text-xs sm:text-sm">
            {exercise.muscleGroup.charAt(0).toUpperCase() + exercise.muscleGroup.slice(1)}
          </AdaptiveDialogDescription>
        </AdaptiveDialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-2">
          {/* On mobile, show video/image first, then description and instructions */}
          <div className="space-y-4 md:order-2">
            {exercise.videoUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden">
                <iframe
                  src={getEmbedUrl(exercise.videoUrl)}
                  title={`${exercise.name} demonstration`}
                  className="w-full h-full"
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
              </div>
            ) : exercise.imageUrl ? (
              <div className="aspect-video rounded-lg overflow-hidden bg-muted">
                <img
                  src={exercise.imageUrl}
                  alt={exercise.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                <p className="text-muted-foreground text-xs sm:text-sm">No image or video available</p>
              </div>
            )}
          </div>

          <div className="space-y-4 md:order-1">
            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">Description</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">{exercise.description}</p>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-medium mb-2">Instructions</h3>
              <div className="space-y-2">
                {exercise.instructions.split("\n").map((step, index) => (
                  <p key={index} className="text-xs sm:text-sm text-muted-foreground">
                    {step}
                  </p>
                ))}
              </div>
            </div>
          </div>
        </div>
      </AdaptiveDialogContent>
    </AdaptiveDialog>
  );
};

// Helper function to convert video URLs to embedded format
function getEmbedUrl(url: string): string {
  // Handle YouTube URLs
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
    const match = url.match(youtubeRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  }
  
  // Handle Vimeo URLs
  if (url.includes("vimeo.com")) {
    const vimeoRegex = /vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/(?:[^\/]*)\/videos\/|)(\d+)(?:|\/\?)/;
    const match = url.match(vimeoRegex);
    if (match && match[1]) {
      return `https://player.vimeo.com/video/${match[1]}`;
    }
  }
  
  return url; // Return original URL if not YouTube or Vimeo
}

export default ExerciseDetail;