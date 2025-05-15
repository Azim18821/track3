import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, RotateCcw, StopCircle, Timer, Hourglass, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface EnhancedWorkoutTimerProps {
  isRunning: boolean;
  seconds: number;
  isRestMode: boolean;
  onToggleTimer: () => void;
  onResetTimer: () => void;
  onStartRestTimer: (seconds: number) => void;
  onSoundToggle?: () => void;
  isSoundEnabled?: boolean;
}

const EnhancedWorkoutTimer: React.FC<EnhancedWorkoutTimerProps> = ({
  isRunning,
  seconds,
  isRestMode,
  onToggleTimer,
  onResetTimer,
  onStartRestTimer,
  onSoundToggle,
  isSoundEnabled = true
}) => {
  const [activeTab, setActiveTab] = useState<string>(isRestMode ? "rest" : "workout");
  const [showFullscreen, setShowFullscreen] = useState<boolean>(false);
  const [customRestTime, setCustomRestTime] = useState<number>(60);
  
  // Update active tab when rest mode changes
  useEffect(() => {
    setActiveTab(isRestMode ? "rest" : "workout");
  }, [isRestMode]);

  // Format time as MM:SS
  const formatTime = (timeInSeconds: number): string => {
    const mins = Math.floor(timeInSeconds / 60);
    const secs = timeInSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Predefined rest times
  const restTimeOptions = [30, 45, 60, 90, 120, 180];

  return (
    <div className="bg-background border rounded-lg shadow-sm">
      <Tabs 
        value={activeTab} 
        onValueChange={setActiveTab}
        className="w-full"
      >
        <div className="border-b px-1 flex items-center justify-between">
          <TabsList className="p-0 h-10">
            <TabsTrigger
              value="workout"
              className={`rounded-none border-b-2 border-transparent px-3 ${
                activeTab === 'workout' ? 'border-primary' : ''
              } data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
              onClick={() => {
                if (isRestMode && isRunning) {
                  onResetTimer();
                }
              }}
            >
              <Timer className="h-4 w-4 mr-2" />
              Workout
            </TabsTrigger>
            <TabsTrigger
              value="rest"
              className={`rounded-none border-b-2 border-transparent px-3 ${
                activeTab === 'rest' ? 'border-primary' : ''
              } data-[state=active]:bg-transparent data-[state=active]:shadow-none`}
            >
              <Hourglass className="h-4 w-4 mr-2" />
              Rest
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center mr-2">
            {onSoundToggle && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8" 
                      onClick={onSoundToggle}
                    >
                      {isSoundEnabled ? (
                        <Volume2 className="h-4 w-4" />
                      ) : (
                        <VolumeX className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isSoundEnabled ? 'Disable sound' : 'Enable sound'}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>

        <TabsContent value="workout" className="m-0 py-4 px-5">
          <div className="flex flex-col items-center">
            <div 
              className={`text-3xl font-mono font-semibold mb-2 ${
                isRunning && !isRestMode ? 'text-primary animate-pulse' : ''
              }`}
            >
              {formatTime(seconds)}
            </div>
            
            <p className="text-center text-sm text-muted-foreground mb-3">
              {isRunning && !isRestMode ? 'Workout in progress' : 'Total workout time'}
            </p>
            
            <div className="flex gap-2">
              <Button
                variant={isRunning && !isRestMode ? "destructive" : "default"}
                onClick={onToggleTimer}
                className="gap-1"
                size="sm"
              >
                {isRunning && !isRestMode ? (
                  <>
                    <Pause className="h-4 w-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Start
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                onClick={onResetTimer}
                className="gap-1"
                size="sm"
                disabled={seconds === 0}
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="rest" className="m-0 py-4 px-5">
          <div className="flex flex-col items-center">
            {isRestMode ? (
              /* Rest countdown timer */
              <div className="w-full flex flex-col items-center">
                <div 
                  className={`text-3xl font-mono font-semibold mb-2 ${
                    isRunning ? 'text-blue-600 dark:text-blue-500' : ''
                  }`}
                >
                  {formatTime(seconds)}
                </div>
                
                <Badge 
                  variant="secondary"
                  className={`mb-3 ${
                    isRunning 
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' 
                      : ''
                  }`}
                >
                  {isRunning ? 'Rest timer active' : 'Start rest timer'}
                </Badge>
                
                <div className="flex gap-2">
                  <Button
                    variant={isRunning ? "outline" : "default"}
                    onClick={onToggleTimer}
                    className="gap-1"
                    size="sm"
                    disabled={!isRestMode}
                  >
                    {isRunning ? (
                      <>
                        <Pause className="h-4 w-4" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Start
                      </>
                    )}
                  </Button>
                  
                  {isRunning && (
                    <Button
                      variant="outline"
                      onClick={onResetTimer}
                      className="gap-1 border-red-200 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:hover:bg-red-950/50 dark:text-red-400"
                      size="sm"
                    >
                      <StopCircle className="h-4 w-4" />
                      End Rest
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              /* Rest timer setup */
              <div className="w-full">
                <div className="flex justify-between items-center mb-3">
                  <div className="text-sm font-medium">Rest Duration:</div>
                  <div className="font-mono text-lg">{customRestTime}s</div>
                </div>
                
                <Slider
                  value={[customRestTime]}
                  min={10}
                  max={300}
                  step={5}
                  className="mb-4"
                  onValueChange={(values) => setCustomRestTime(values[0])}
                />
                
                <div className="flex flex-wrap gap-2 mb-4">
                  {restTimeOptions.map(seconds => (
                    <Button 
                      key={seconds}
                      variant="outline"
                      size="sm"
                      className={
                        customRestTime === seconds
                          ? "bg-primary/10 border-primary/50"
                          : ""
                      }
                      onClick={() => setCustomRestTime(seconds)}
                    >
                      {seconds}s
                    </Button>
                  ))}
                </div>
                
                <Button
                  className="w-full gap-2"
                  onClick={() => onStartRestTimer(customRestTime)}
                >
                  <Hourglass className="h-4 w-4" />
                  Start {customRestTime}s Rest Timer
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedWorkoutTimer;