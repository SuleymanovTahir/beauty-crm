// /frontend/src/components/ui/resizable.tsx
"use client";

import * as React from "react";
import { GripVerticalIcon } from "lucide-react";
import {
  Group as ResizableGroup,
  Panel as ResizablePanelPrimitive,
  Separator as ResizableSeparator,
} from "react-resizable-panels";

import { cn } from "./utils";

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof ResizableGroup>) {
  return (
    <ResizableGroup
      data-slot="resizable-panel-group"
      className={cn(
        "flex h-full w-full",
        orientation === "vertical" ? "flex-col" : "flex-row",
        className,
      )}
      orientation={orientation}
      {...props}
    />
  );
}

function ResizablePanel({
  ...props
}: React.ComponentProps<typeof ResizablePanelPrimitive>) {
  return <ResizablePanelPrimitive data-slot="resizable-panel" {...props} />;
}

function ResizableHandle({
  withHandle,
  className,
  ...props
}: React.ComponentProps<typeof ResizableSeparator> & {
  withHandle?: boolean;
}) {
  return (
    <ResizableSeparator
      data-slot="resizable-handle"
      className={cn(
        "bg-border focus-visible:ring-ring relative flex shrink-0 items-center justify-center focus-visible:ring-1 focus-visible:ring-offset-1 focus-visible:outline-hidden",
        "aria-[orientation=vertical]:h-full aria-[orientation=vertical]:w-px",
        "aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full",
        "[&[aria-orientation=horizontal]>div]:rotate-90",
        className,
      )}
      {...props}
    >
      {withHandle && (
        <div className="bg-border z-10 flex h-4 w-3 items-center justify-center rounded-xs border">
          <GripVerticalIcon className="size-2.5" />
        </div>
      )}
    </ResizableSeparator>
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
