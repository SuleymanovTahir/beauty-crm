"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

/**
 * Calendar component synced with new_admin design system and react-day-picker v9 structure.
 */
function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-1", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-4 justify-center",
                month: "flex flex-col gap-4 relative", // relative for absolute positioning of nav buttons
                month_caption: "flex justify-center pt-2 relative items-center w-full mb-4",
                caption_label: "text-sm font-semibold text-foreground",
                nav: "flex items-center absolute top-1.5 left-0 right-0 justify-between px-1 w-full z-10",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-accent border border-gray-200 shadow-sm rounded-md shadow-sm transition-colors"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-accent border border-gray-200 shadow-sm rounded-md shadow-sm transition-colors"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 w-full mb-3",
                weekday: "text-muted-foreground font-medium text-[0.8rem] text-center",
                weeks: "flex flex-col gap-1.5 w-full",
                week: "grid grid-cols-7 w-full gap-1",
                day: "flex items-center justify-center p-0",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-medium rounded-md transition-all hover:bg-accent focus:bg-accent active:scale-95"
                ),
                selected: "bg-accent text-accent-foreground rounded-md font-bold",
                today: "bg-muted/30 text-foreground font-black rounded-md ring-1 ring-inset ring-muted",
                outside: "text-muted-foreground/30 opacity-40 selection:bg-transparent pointer-events-none",
                disabled: "text-muted-foreground/20 opacity-30 cursor-not-allowed",
                range_middle: "bg-accent/50 text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Icon className="size-4 text-foreground" />;
                },
            }}
            {...props}
        />
    );
}

export { Calendar };
