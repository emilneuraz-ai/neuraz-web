export interface WorkScene {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  description: string;
  detail: string;
  device?: 'desktop' | 'mobile';
  image?: { src: string; width: number; height: number; alt: string };
}

export interface WorkStory {
  id: string;
  title: string;
  category: string;
  url?: string;
  accent: string;
  theme?: 'light' | 'dark';
  format?: 'desktop' | 'mobile' | 'presentation';
  scenes: WorkScene[];
}
