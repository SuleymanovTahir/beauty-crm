"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker } from "react-day-picker";

import { cn } from "./utils";
import { buttonVariants } from "./button";

function Calendar({
    className,
    classNames,
    showOutsideDays = true,
    ...props
}: React.ComponentProps<typeof DayPicker>) {
    return (
        <DayPicker
            showOutsideDays={showOutsideDays}
            className={cn("p-3", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-2 justify-center",
                month: "flex flex-col gap-4 relative",
                month_caption: "flex justify-center pt-1.5 relative items-center w-full mb-4",
                caption_label: "text-base font-bold text-gray-900 capitalize",
                nav: "flex items-center absolute top-1 left-0 right-0 justify-between px-2 w-full z-50",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg opacity-100 flex items-center justify-center pointer-events-auto"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg opacity-100 flex items-center justify-center pointer-events-auto"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 w-full mb-4",
                weekday: "text-muted-foreground font-bold text-[0.7rem] uppercase text-center",
                weeks: "flex flex-col gap-1 w-full",
                week: "grid grid-cols-7 w-full gap-1",
                day: "flex items-center justify-center p-0",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-medium rounded-xl transition-all hover:bg-purple-50 aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:opacity-100"
                ),
                selected: "bg-accent text-accent-foreground rounded-xl font-bold",
                today: "bg-muted/30 text-foreground rounded-xl font-black ring-1 ring-inset ring-muted",
                outside: "text-muted-foreground/20 opacity-30",
                disabled: "text-muted-foreground/10 opacity-20 cursor-not-allowed",
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    if (orientation === "left") {
                        return <ChevronLeft className="h-4 w-4 text-slate-900" />;
                    }
                    return <ChevronRight className="h-4 w-4 text-slate-900" />;
                },
            }}
            {...props}
        />
    );
}

export { Calendar };
