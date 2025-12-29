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
            className={cn("p-2", className)}
            classNames={{
                months: "flex flex-col sm:flex-row gap-2 justify-center",
                month: "flex flex-col gap-4 relative",
                month_caption: "flex justify-center pt-2 relative items-center w-full mb-8 px-12 h-8", // Increased height and mb
                caption_label: "text-sm font-black text-gray-900 uppercase tracking-widest", // More aggressive font
                nav: "absolute top-2 left-0 right-0 flex items-center justify-between w-full px-2 z-50 pointer-events-none",
                button_previous: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg flex items-center justify-center opacity-100 !visible pointer-events-auto transition-all active:scale-95 z-50"
                ),
                button_next: cn(
                    buttonVariants({ variant: "outline" }),
                    "h-8 w-8 bg-white p-0 hover:bg-slate-50 border border-slate-200 shadow-sm rounded-lg flex items-center justify-center opacity-100 !visible pointer-events-auto transition-all active:scale-95 z-50"
                ),
                month_grid: "w-full border-collapse",
                weekdays: "grid grid-cols-7 w-full mb-4",
                weekday: "text-slate-400 font-black text-[10px] uppercase text-center tracking-tighter",
                weeks: "flex flex-col gap-1 w-full",
                week: "grid grid-cols-7 w-full gap-1",
                day: "flex items-center justify-center p-0",
                day_button: cn(
                    buttonVariants({ variant: "ghost" }),
                    "h-10 w-10 p-0 font-bold text-sm rounded-xl transition-all hover:bg-purple-50 aria-selected:bg-accent aria-selected:text-accent-foreground aria-selected:opacity-100"
                ),
                selected: "bg-purple-600 !text-white rounded-xl font-black shadow-lg shadow-purple-100",
                today: "bg-slate-100 text-slate-900 rounded-xl",
                outside: "text-slate-400 opacity-50", // Higher visibility
                disabled: "text-slate-300 opacity-40 cursor-not-allowed", // Higher visibility
                range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
                hidden: "invisible",
                ...classNames,
            }}
            components={{
                Chevron: ({ orientation }) => {
                    const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
                    return <Icon className="h-4 w-4 text-slate-900 stroke-[3px]" />;
                },
            }}
            {...props}
        />
    );
}

export { Calendar };
