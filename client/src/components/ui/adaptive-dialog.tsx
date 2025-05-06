"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { isNative } from "@/lib/capacitor"

const AdaptiveDialog = DialogPrimitive.Root

const AdaptiveDialogTrigger = DialogPrimitive.Trigger

const AdaptiveDialogPortal = DialogPrimitive.Portal

const AdaptiveDialogClose = DialogPrimitive.Close

const AdaptiveDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      // When in native mode, make the overlay slightly less prominent but maintain the blur
      isNative() && "bg-black/50 backdrop-blur-[2px]",
      className
    )}
    {...props}
  />
))
AdaptiveDialogOverlay.displayName = DialogPrimitive.Overlay.displayName

const AdaptiveDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  const native = isNative()
  
  if (native) {
    // In native mode, create a more sheet-like appearance that feels more native
    return (
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={ref}
          className={cn(
            "fixed z-50 w-full overflow-y-auto rounded-t-xl border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom-full data-[state=open]:slide-in-from-bottom-full sm:max-w-lg",
            "bottom-0 left-0 right-0 max-h-[85vh] p-4 pt-5",
            className
          )}
          {...props}
        >
          {children}
          <DialogPrimitive.Close className="absolute right-3 top-3 rounded-full w-7 h-7 flex items-center justify-center bg-muted/50 hover:bg-muted opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
          {/* Add a visual handle for the sheet-like UI */}
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <div className="w-12 h-1.5 rounded-full bg-muted-foreground/20" />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    )
  }
  
  // Standard web dialog implementation
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          "fixed left-[50%] top-[50%] z-50 grid w-[95%] max-w-lg max-h-[85vh] overflow-y-auto translate-x-[-50%] translate-y-[-50%] gap-2 md:gap-4 border bg-background p-4 md:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] rounded-lg",
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-3 top-3 md:right-4 md:top-4 rounded-full w-7 h-7 flex items-center justify-center bg-muted/50 hover:bg-muted opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
})
AdaptiveDialogContent.displayName = DialogPrimitive.Content.displayName

const AdaptiveDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      isNative() && "pt-3", // Add extra padding top when in native mode
      className
    )}
    {...props}
  />
)
AdaptiveDialogHeader.displayName = "AdaptiveDialogHeader"

const AdaptiveDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      isNative() && "pb-4", // Add extra padding bottom when in native mode
      className
    )}
    {...props}
  />
)
AdaptiveDialogFooter.displayName = "AdaptiveDialogFooter"

const AdaptiveDialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight",
      isNative() && "text-center pb-2", // Center text in native mode
      className
    )}
    {...props}
  />
))
AdaptiveDialogTitle.displayName = DialogPrimitive.Title.displayName

const AdaptiveDialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
AdaptiveDialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  AdaptiveDialog,
  AdaptiveDialogPortal,
  AdaptiveDialogOverlay,
  AdaptiveDialogClose,
  AdaptiveDialogTrigger,
  AdaptiveDialogContent,
  AdaptiveDialogHeader,
  AdaptiveDialogFooter,
  AdaptiveDialogTitle,
  AdaptiveDialogDescription,
}