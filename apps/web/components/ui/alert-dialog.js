"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "./button";

function AlertDialog({ open, onOpenChange, children }) {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/80 animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      <div className="relative z-50 w-full max-w-md rounded-lg border bg-background p-6 shadow-lg animate-in fade-in-0 zoom-in-95">
        {children}
      </div>
    </div>
  );
}

function AlertDialogHeader({ className, ...props }) {
  return <div className={cn("flex flex-col space-y-2", className)} {...props} />;
}

function AlertDialogTitle({ className, ...props }) {
  return <h2 className={cn("text-lg font-semibold", className)} {...props} />;
}

function AlertDialogDescription({ className, ...props }) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function AlertDialogFooter({ className, ...props }) {
  return <div className={cn("flex justify-end gap-2 mt-4", className)} {...props} />;
}

function AlertDialogCancel({ children = "Cancel", ...props }) {
  return <Button variant="outline" {...props}>{children}</Button>;
}

function AlertDialogAction({ children = "Continue", ...props }) {
  return <Button variant="destructive" {...props}>{children}</Button>;
}

export {
  AlertDialog,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
};
