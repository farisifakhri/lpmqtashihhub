import React from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ArrowLeft, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export const ModulePlaceholder = ({
  title,
  moduleName,
  sprintTarget,
  description,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
          <p className="text-xs font-semibold text-primary-700 mt-1">
            Modul: {moduleName} · Target Implementasi: {sprintTarget}
          </p>
        </div>
        <Link to="/">
          <Button variant="outline" size="sm" icon={<ArrowLeft className="w-4 h-4" />}>
            Kembali ke Beranda
          </Button>
        </Link>
      </div>

      <Card className="p-8 text-center max-w-2xl mx-auto space-y-4">
        <div className="w-12 h-12 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center mx-auto">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-neutral-900">Baseline Modul Siap Digunakan</h2>
        <p className="text-sm text-neutral-600 leading-relaxed">{description}</p>
        <div className="pt-4 border-t border-neutral-200">
          <p className="text-xs text-neutral-500">
            Sistem Pentashihan Mushaf Al-Qur'an (LPMQ) — Arsitektur Modular Monolith
          </p>
        </div>
      </Card>
    </div>
  );
};
