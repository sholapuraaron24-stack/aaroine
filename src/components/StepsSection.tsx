import React from 'react';

const steps = [
  {
    number: '1',
    title: 'Upload image',
    description: 'Choose any photo from your device or paste directly.',
  },
  {
    number: '2',
    title: 'AI Processing',
    description: 'Our engine isolates your subject with extreme precision.',
  },
  {
    number: '3',
    title: 'Download',
    description: 'Save your PNG with transparent background in high res.',
  },
];

export default function StepsSection() {
  return (
    <section id="how-it-works" className="py-20 px-6 sm:px-8 bg-slate-50 border-t border-b border-light-100">
      <div className="mx-auto max-w-7xl">
        <h2 className="text-3xl font-bold tracking-tight text-center text-slate-900 mb-16">
          Three Steps to Perfection
        </h2>

        <div className="relative grid grid-cols-1 gap-12 md:grid-cols-3">
          {/* Connector dashed line for desktop */}
          <div className="absolute top-1/4 left-[10%] right-[10%] hidden h-[2px] border-t-2 border-dashed border-slate-200 md:block" />

          {steps.map((st, idx) => (
            <div key={idx} className="relative z-10 flex flex-col items-center text-center">
              {/* Step circle badge */}
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-900 text-lg font-bold text-white shadow-md ring-8 ring-slate-100 transition-transform hover:scale-105 duration-350">
                {st.number}
              </div>

              <h3 className="mt-6 text-xl font-semibold text-slate-900">
                {st.title}
              </h3>
              <p className="mt-3 text-slate-600 text-sm max-w-xs leading-relaxed">
                {st.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
