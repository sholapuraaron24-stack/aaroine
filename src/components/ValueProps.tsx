import React from 'react';
import { Sparkles, Zap, Tv, Heart } from 'lucide-react';

const props = [
  {
    icon: Sparkles,
    iconBg: 'bg-blue-50 text-blue-600',
    title: 'AI-Powered',
    description: 'Precision at scale with neural networks trained on millions of images.',
  },
  {
    icon: Zap,
    iconBg: 'bg-purple-50 text-purple-600',
    title: 'One-Click',
    description: 'No technical skills needed. Simply upload and let the magic happen in seconds.',
  },
  {
    icon: Tv,
    iconBg: 'bg-indigo-50 text-indigo-600',
    title: 'HD Quality',
    description: 'Lossless output up to 4K resolution. Perfect for printing and high-end design.',
  },
  {
    icon: Heart,
    iconBg: 'bg-rose-50 text-rose-600',
    title: '100% Free',
    description: 'No subscriptions, no hidden credits. Professional tools for everyone, forever.',
  },
];

export default function ValueProps() {
  return (
    <section id="features" className="py-20 px-6 sm:px-8 bg-white">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {props.map((p, idx) => {
            const IconComponent = p.icon;
            return (
              <div 
                key={idx} 
                className="rounded-2xl border border-slate-100 bg-white p-8 shadow-sm transition-all duration-300 hover:border-blue-100 hover:shadow-md"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${p.iconBg} mb-6`}>
                  <IconComponent className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">
                  {p.title}
                </h3>
                <p className="mt-3 text-slate-600 text-sm leading-relaxed">
                  {p.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
