'use client';

import Link from 'next/link';
import { PawPrint, MapPin, Calendar } from 'lucide-react';

interface DogCardProps {
  id: string;
  name: string;
  registrationNumber?: string;
  sex: 'MALE' | 'FEMALE';
  birthDate?: string;
  color?: string;
  country?: string;
  photoUrl?: string;
  coi?: number;
}

export default function DogCard({
  id,
  name,
  registrationNumber,
  sex,
  birthDate,
  color,
  country,
  photoUrl,
  coi,
}: DogCardProps) {
  const sexColor = sex === 'MALE' ? 'text-blue-600' : 'text-pink-600';
  const sexLabel = sex === 'MALE' ? 'Macho' : 'Hembra';

  const formatDate = (date?: string) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <Link href={`/dogs/${id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow border border-gray-200 overflow-hidden cursor-pointer">
        {/* Photo */}
        <div className="aspect-video bg-gray-100 relative">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <PawPrint className="w-12 h-12 text-gray-300" />
            </div>
          )}
          {coi !== undefined && coi > 0.1 && (
            <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-medium">
              COI: {(coi * 100).toFixed(1)}%
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-1 truncate">
            {name}
          </h3>
          {registrationNumber && (
            <p className="text-sm text-gray-500 mb-2">
              {registrationNumber}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm text-gray-600">
            <span className={`font-medium ${sexColor}`}>{sexLabel}</span>
            {birthDate && (
              <span className="flex items-center space-x-1">
                <Calendar className="w-3 h-3" />
                <span>{formatDate(birthDate)}</span>
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-sm">
            {color && (
              <span className="text-gray-500">{color}</span>
            )}
            {country && (
              <span className="flex items-center space-x-1 text-gray-500">
                <MapPin className="w-3 h-3" />
                <span>{country}</span>
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
