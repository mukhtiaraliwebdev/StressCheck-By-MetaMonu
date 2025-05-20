import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Zap, BarChartHorizontalBig } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="container mx-auto py-8">
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-primary">Welcome to StressCall</h1>
        <p className="text-xl text-muted-foreground mt-4">
          Your personal assistant for monitoring and understanding voice stress.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
        <Card className="shadow-lg hover:shadow-xl transition-shadow duration-300">
          <CardHeader>
            <Image 
              src="/images/voice-analysis.png"
              alt="Voice Analysis Illustration"
              width={600}
              height={400}
              className="rounded-t-lg object-cover"
              data-ai-hint="voice wave analysis"
            />
          </CardHeader>
          <CardContent className="pt-6">
            <h2 className="text-3xl font-semibold mb-3 text-primary">Understand Your Stress</h2>
            <p className="text-muted-foreground mb-6">
              StressCall uses advanced AI to analyze voice patterns, providing insights into your stress levels during calls or through on-demand checks.
            </p>
            <div className="flex gap-4">
              <Button asChild size="lg">
                <Link href="/stress-check">Check Stress Now</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        
        <div className="space-y-6">
        <FeatureCard
  icon={<Activity className="w-8 h-8 text-accent" />}
  title="Voice-Based Stress Detection"
  description="Analyze stress levels through vocal cues in simulated call scenarios, showcasing how real-time detection works."
/>

          <FeatureCard
            icon={<Zap className="w-8 h-8 text-accent" />}
            title="On-Demand Analysis"
            description="Record your voice anytime to get a quick stress assessment and track your well-being."
          />
          <FeatureCard
            icon={<BarChartHorizontalBig className="w-8 h-8 text-accent" />}
            title="Insightful Reports"
            description="Review detailed reports and visualizations of your stress patterns over time."
          />
        </div>
      </section>

      <section className="text-center py-10 bg-card rounded-lg shadow-md">
        <h2 className="text-3xl font-semibold mb-4 text-primary">Ready to Start?</h2>
        <p className="text-lg text-muted-foreground mb-6">
          Take control of your well-being by understanding your stress.
        </p>
        <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground">
          <Link href="/stress-check">Get Your First Stress Report</Link>
        </Button>
      </section>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow duration-300">
      <CardContent className="p-6 flex items-start gap-4">
        <div className="p-3 bg-accent/20 rounded-full">
          {icon}
        </div>
        <div>
          <h3 className="text-xl font-semibold mb-1 text-primary">{title}</h3>
          <p className="text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}
