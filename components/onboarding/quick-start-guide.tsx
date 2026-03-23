'use client';

import { Card } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowRight, BookOpen, Users, Grid3x3, BarChart3 } from 'lucide-react';

export default function QuickStartGuide() {
  const steps = [
    {
      number: 1,
      title: 'Create Rooms',
      description: 'Set up exam rooms with custom grid sizes',
      icon: BookOpen,
      link: '/rooms',
      action: 'Add Room',
    },
    {
      number: 2,
      title: 'Add Students',
      description: 'Add students or import them from CSV',
      icon: Users,
      link: '/students',
      action: 'Add Student',
    },
    {
      number: 3,
      title: 'Allocate Seats',
      description: 'Visually assign students to seats',
      icon: Grid3x3,
      link: '/allocation',
      action: 'Allocate',
    },
    {
      number: 4,
      title: 'View Reports',
      description: 'Analyze occupancy and export charts',
      icon: BarChart3,
      link: '/reports',
      action: 'View Reports',
    },
  ];

  return (
    <Card className="p-8 bg-gradient-to-br from-blue-600/10 to-violet-600/10 border-blue-500/20">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Getting Started</h2>
        <p className="text-slate-400">
          Follow these simple steps to set up your first exam seating arrangement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div key={step.number} className="relative">
              <Link href={step.link}>
                <div className="p-4 bg-slate-700/50 hover:bg-slate-700 rounded-lg transition-colors cursor-pointer h-full flex flex-col">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-shrink-0">
                      <div className="flex items-center justify-center h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-sm">
                        {step.number}
                      </div>
                    </div>
                    <Icon size={20} className="text-blue-400" />
                  </div>
                  <h3 className="font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-slate-400 mb-4 flex-grow">{step.description}</p>
                  <div className="flex items-center text-blue-400 text-sm font-medium hover:text-blue-300">
                    {step.action}
                    <ArrowRight size={14} className="ml-2" />
                  </div>
                </div>
              </Link>
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute -right-2 top-1/3 text-slate-600 text-2xl">
                  →
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-700/30 rounded border border-slate-600/50">
        <p className="text-sm text-slate-300">
          <span className="font-semibold">💡 Tip:</span> You can also import students from a CSV file using the import feature on the Students page.
        </p>
      </div>
    </Card>
  );
}
