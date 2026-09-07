// src/components/AbstractRankingDetail.tsx
import React, { useState } from 'react';
import {
  X,
  Star,
  Trophy,
  Award,
  Calendar,
  Users,
  Mail,
  Phone,
  MapPin,
  FileText,
  CheckCircle,
  Clock,
  BarChart3,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../lib/api';

interface AbstractDetailProps {
  abstract: any;
  onClose: () => void;
  onResend: (id: number) => void;
}

export const AbstractRankingDetail: React.FC<AbstractDetailProps> = ({
  abstract,
  onClose,
  onResend,
}) => {
  const [loading, setLoading] = useState(false);

  if (!abstract) return null;

  const handleResend = async () => {
    setLoading(true);
    await onResend(abstract.id);
    setLoading(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.9, y: 20 }}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-gradient-to-r from-teal-50 to-emerald-50 px-6 py-5 border-b border-gray-100 flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-3 mb-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-bold">
                  <Trophy className="w-3 h-3" />
                  Rank #{abstract.rank}
                </span>
                <span className="text-xs text-gray-500">
                  {abstract.sub_theme}
                </span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                {abstract.abstract.title}
              </h3>
              <p className="text-xs text-gray-500">
                {abstract.abstract.reference} • Submitted {new Date(abstract.abstract.submitted_at).toLocaleDateString()}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors shrink-0"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Score Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-500">Overall Score</p>
                <p className="text-2xl font-bold text-yellow-600 flex items-center justify-center gap-1">
                  <Star className="w-5 h-5 fill-current" />
                  {abstract.average_score.toFixed(2)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-500">Reviews</p>
                <p className="text-2xl font-bold text-blue-600">
                  {abstract.review_count}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-xl p-4 text-center">
                <p className="text-xs font-bold uppercase text-gray-500">Presentation</p>
                <div className="mt-1">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                    abstract.abstract.presentation_type === 'oral'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {abstract.abstract.presentation_type === 'oral' ? 'Oral' : 'Poster'}
                  </span>
                </div>
              </div>
            </div>

            {/* Authors */}
            <div>
              <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Authors
              </h4>
              <div className="space-y-3">
                {abstract.abstract.authors.map((author: any) => (
                  <div key={author.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {author.name}
                          {author.is_corresponding && (
                            <span className="ml-2 text-xs text-teal-600 font-bold">
                              (Corresponding)
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3 h-3" />
                            {author.email}
                          </span>
                          {author.affiliation && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {author.affiliation}
                            </span>
                          )}
                          {author.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {author.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Abstract Body */}
            {abstract.abstract.body && (
              <div>
                <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Abstract
                </h4>
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {abstract.abstract.body}
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Theme Ranking */}
            {abstract.sub_theme_rank && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border-2 border-indigo-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase text-gray-500">
                      Sub-Theme Ranking
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      #{abstract.sub_theme_rank} in {abstract.sub_theme}
                    </p>
                  </div>
                  <Award className="w-8 h-8 text-indigo-500" />
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100">
              <button
                onClick={handleResend}
                disabled={loading}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                Resend Notification
              </button>
              <button
                onClick={onClose}
                className="flex-1 min-w-[120px] inline-flex items-center justify-center px-4 py-2.5 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-bold hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};