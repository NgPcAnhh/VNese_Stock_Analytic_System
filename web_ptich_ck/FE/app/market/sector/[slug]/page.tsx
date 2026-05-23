import React from "react";
import SectorDetailDashboard from "@/components/market/SectorDetailDashboard";
import { Footer } from "@/components/layout/Footer";

interface SectorDetailPageProps {
    params: Promise<{ slug: string }>;
}

export default async function SectorDetailPage({ params }: SectorDetailPageProps) {
    const { slug } = await params;

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <main className="flex-grow max-w-[1440px] w-full mx-auto px-4 py-6">
                <SectorDetailDashboard slug={slug} />
            </main>
            <Footer />
        </div>
    );
}
