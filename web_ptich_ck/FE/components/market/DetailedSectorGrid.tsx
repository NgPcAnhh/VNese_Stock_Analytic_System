"use client";

import React, { useState } from "react";
import { DETAILED_SECTOR_DATA } from "@/lib/mockData";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const DetailedSectorGrid = () => {
    const [selectedSectors, setSelectedSectors] = useState<string[]>(
        DETAILED_SECTOR_DATA.map((s) => s.sector)
    );

    const toggleSector = (sector: string) => {
        setSelectedSectors((prev) =>
            prev.includes(sector)
                ? prev.filter((s) => s !== sector)
                : [...prev, sector]
        );
    };

    return (
        <div className="flex flex-col md:flex-row gap-4 mt-6">
            {/* Sidebar Filters */}
            <Card className="w-full md:w-64 shrink-0 shadow-sm border-border">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-foreground">Ngành hiển thị</h3>
                </div>
                <CardContent className="p-0">
                    <ScrollArea className="h-[400px] p-4">
                        <div className="space-y-4">
                            {DETAILED_SECTOR_DATA.map((item) => (
                                <div key={item.sector} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={item.sector}
                                        checked={selectedSectors.includes(item.sector)}
                                        onCheckedChange={() => toggleSector(item.sector)}
                                    />
                                    <label
                                        htmlFor={item.sector}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                    >
                                        {item.sector} ({item.stocks.length})
                                    </label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* Main Grid Content */}
            <div className="flex-1 space-y-6">
                {DETAILED_SECTOR_DATA.filter((s) => selectedSectors.includes(s.sector)).map(
                    (sectorGroup) => (
                        <div key={sectorGroup.sector}>
                            <h3 className="text-lg font-bold text-foreground mb-3 bg-muted/50 p-2 rounded border-l-4 border-orange-500">
                                {sectorGroup.sector}
                            </h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                                {sectorGroup.stocks.map((stock) => (
                                    <Card
                                        key={stock.ticker}
                                        className="shadow-sm hover:shadow-md transition-shadow border-border"
                                    >
                                        <CardContent className="p-3 flex flex-col justify-between h-full">
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-bold text-foreground">
                                                    {stock.ticker}
                                                </span>
                                                <span
                                                    className={`text-xs font-bold px-1.5 py-0.5 rounded ${stock.change >= 0
                                                            ? "bg-green-100 text-green-700"
                                                            : "bg-red-100 text-red-700"
                                                        }`}
                                                >
                                                    {stock.change > 0 ? "+" : ""}
                                                    {stock.change}%
                                                </span>
                                            </div>
                                            <div className="text-center font-medium text-muted-foreground">
                                                {stock.price}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default DetailedSectorGrid;
