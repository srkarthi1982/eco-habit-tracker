export interface LandingLink {
  label: string;
  href: string;
  variant?: "ghost";
}

export interface LandingMetric {
  value: string;
  label: string;
}

export interface LandingFeature {
  title: string;
  description: string;
}

export interface LandingStep {
  title: string;
  description: string;
}

export interface LandingShowcase {
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  calloutLabel?: string;
  calloutValue?: string;
}

export interface LandingSectionWithItems {
  title: string;
  lead: string;
  items: LandingFeature[];
}

export interface LandingWorkflow {
  eyebrow?: string;
  title: string;
  lead: string;
  steps: LandingStep[];
}

export interface LandingHeroPanel {
  eyebrow: string;
  title: string;
  steps: string[];
  meta: LandingMetric[];
}

export interface LandingFinalCta {
  title: string;
  description: string;
  primaryCta: LandingLink;
  secondaryCta?: LandingLink;
}

export interface LandingPageContent {
  categoryLabel: string;
  appLabel?: string;
  title: string;
  subtitle: string;
  heroBullets: string[];
  primaryCta: LandingLink;
  secondaryCta?: LandingLink;
  heroNote?: string;
  heroPanel: LandingHeroPanel;
  heroStats?: LandingMetric[];
  features: LandingSectionWithItems;
  pillars: LandingSectionWithItems;
  workflow: LandingWorkflow;
  showcase?: LandingShowcase;
  finalCta: LandingFinalCta;
}
