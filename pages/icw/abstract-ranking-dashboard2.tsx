// pages/icw/abstract-ranking-dashboard.tsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  Trophy,
  Medal,
  Star,
  Users,
  TrendingUp,
  Award,
  CheckCircle,
  XCircle,
  Eye,
  Mail,
  RefreshCw,
  Download,
  Loader2,
  BarChart3,
  PieChart,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Layout from '../containers/Layout';
import PageTitle from '../components/Typography/PageTitle';
import api from '../../lib/api';

// Types
interface RankedAbstract {
  rank: number;
  abstract: {
    id: number;
    reference: string;
    title: string;
    sub_theme: string;
    average_score: number;
    status: string;
    presentation_type: string;
    authors: Array<{
      id: number;
      name: string;
      email: string;
      affiliation: string;
      is_corresponding: boolean;
    }>;
  };
  average_score: number;
  review_count: number;
  sub_theme: string;
}

interface RankingData {
  overall: RankedAbstract[];
  sub_themes: Record<string, RankedAbstract[]>;
}

interface Statistics {
  total_accepted: number;
  oral_count: number;
  poster_count: number;
  notifications_sent: number;
  pending_notifications: number;
  average_score: number;
}

// ─── Components ──────────────────────────────────────────────────────────────

const StatusBadge: React.FC<{ type: 'Oral' | 'Poster' | 'Either' }> = ({ type }) => {
  const styles = {
    Oral: 'bg-green-100 text-green-800 border-green-200',
    Poster: 'bg-blue-100 text-blue-800 border-blue-200',
    Either: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  };
  
  const labels = {
    Oral: 'Oral Presentation',
    Poster: 'Poster Presentation',
    Either: 'Either ',
  };
  
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${styles[type]}`}>
      {type === 'Oral' && <Trophy className="w-3 h-3 mr-1" />}
      {type === 'Poster' && <Award className="w-3 h-3 mr-1" />}
      {labels[type]}
    </span>
  );
};

const ScoreDisplay: React.FC<{ score: number; size?: 'sm' | 'md' | 'lg' }> = ({ score, size = 'md' }) => {
  const sizes = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-xl',
  };
  
  const getColor = (score: number) => {
    if (score >= 4.5) return 'text-green-600';
    if (score >= 3.5) return 'text-blue-600';
    if (score >= 2.5) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${sizes[size]} ${getColor(score)}`}>
      <Star className={`${size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} fill-current`} />
      {score.toFixed(2)}
    </span>
  );
};

// ─── Abstract Detail Modal ──────────────────────────────────────────────────

const AbstractDetailModal: React.FC<{
  abstract: RankedAbstract | null;
  onClose: () => void;
  onResend: (id: number) => void;
}> = ({ abstract, onClose, onResend }) => {
  const [loading, setLoading] = useState(false);

  if (!abstract) return null;

  const handleResend = async () => {
    setLoading(true);
    await onResend(abstract.abstract.id);
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div 
        className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-gray-100 animate-fadeInUp"
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
              <span className="text-xs text-gray-500">{abstract.sub_theme}</span>
            </div>
            <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
              {abstract.abstract.title}
            </h3>
            <p className="text-xs text-gray-500">
              {abstract.abstract.reference}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/50 transition-colors shrink-0"
          >
            <XCircle className="w-5 h-5 text-gray-500" />
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
                <StatusBadge type={abstract.abstract.presentation_type as 'Oral' | 'Poster' || 'Either'} />
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
              {abstract.abstract.authors.map((author) => (
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
                      {author.affiliation && (
                        <p className="text-xs text-gray-500 mt-0.5">{author.affiliation}</p>
                      )}
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
                <BarChart3 className="w-4 h-4" />
                Abstract
              </h4>
              <div className="bg-gray-50 rounded-xl p-4 max-h-48 overflow-y-auto">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {abstract.abstract.body}
                </p>
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-fadeInUp {
          animation: fadeInUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AbstractRankingDashboard() {
  const [rankings, setRankings] = useState<RankingData | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overall' | 'subthemes'>('overall');
  const [selectedTheme, setSelectedTheme] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAbstract, setSelectedAbstract] = useState<RankedAbstract | null>(null);
  const [sortBy, setSortBy] = useState<'rank' | 'score'>('rank');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Fetch rankings
  const fetchRankings = async () => {
    try {
      setLoading(true);
      const { data } = await api.get('/admin/rankings');
      setRankings(data.data);
      setStatistics(data.statistics);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  // Classify and send notifications
  const handleClassifyAndNotify = async (dryRun: boolean = false) => {
    try {
      setProcessing(true);
      const { data } = await api.post('/admin/rankings/classify-and-notify', { dry_run: dryRun });
      
      if (dryRun) {
        toast.success(`Dry run completed. ${data.results.length} abstracts classified.`);
      } else {
        toast.success(`Notifications sent to ${data.notifications_sent} authors.`);
      }
      
      await fetchRankings();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to process classification');
    } finally {
      setProcessing(false);
    }
  };

  // Resend notification
  const handleResendNotification = async (abstractId: number) => {
    try {
      await api.post(`/admin/rankings/${abstractId}/resend-notification`);
      toast.success('Notification resent successfully');
      await fetchRankings();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to resend notification');
    }
  };

  // Export rankings
  const handleExport = () => {
    if (!rankings) return;
    
    const csvData = [
      ['Rank', 'Reference', 'Title', 'Sub-Theme', 'Score', 'Review Count', 'Presentation Type'],
      ...rankings.overall.map(r => [
        r.rank,
        r.abstract.reference,
        r.abstract.title,
        r.sub_theme,
        r.average_score.toFixed(2),
        r.review_count,
        r.abstract.presentation_type || 'Pending',
      ])
    ];
    
    const csv = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rankings_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchRankings();
  }, []);

  // Get unique sub-themes
  const subThemes = useMemo(() => {
    if (!rankings) return [];
    return Object.keys(rankings.sub_themes);
  }, [rankings]);

  // Get filtered and sorted abstracts
  const filteredAbstracts = useMemo(() => {
    if (!rankings) return [];
    
    let abstracts = [...rankings.overall];
    
    // Filter by search
    if (searchTerm) {
      abstracts = abstracts.filter(r =>
        r.abstract.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.abstract.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.abstract.authors.some(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Filter by sub-theme
    if (selectedTheme !== 'all') {
      abstracts = abstracts.filter(r => r.sub_theme === selectedTheme);
    }
    
    // Sort
    abstracts.sort((a, b) => {
      if (sortBy === 'rank') {
        return sortOrder === 'asc' ? a.rank - b.rank : b.rank - a.rank;
      } else {
        return sortOrder === 'asc' ? a.average_score - b.average_score : b.average_score - a.average_score;
      }
    });
    
    return abstracts;
  }, [rankings, searchTerm, selectedTheme, sortBy, sortOrder]);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <PageTitle>Abstract Rankings - ICW 2026</PageTitle>
            <p className="mt-2 text-sm text-gray-600">
              View and manage abstract rankings, classifications, and notifications
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleClassifyAndNotify(true)}
              disabled={processing}
              className="inline-flex items-center px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Dry Run
            </button>
            <button
              onClick={() => handleClassifyAndNotify(false)}
              disabled={processing}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 text-white rounded-xl text-sm font-bold hover:from-teal-700 hover:to-emerald-700 transition-colors disabled:opacity-50"
            >
              {processing ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Mail className="w-4 h-4 mr-2" />
              )}
              Classify & Notify
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Statistics Cards */}
        {statistics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Accepted</p>
                  <p className="text-2xl font-bold text-gray-900">{statistics.total_accepted}</p>
                </div>
                <div className="p-3 bg-teal-50 rounded-xl">
                  <Users className="w-6 h-6 text-teal-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Oral Presentations</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.oral_count}</p>
                </div>
                <div className="p-3 bg-green-50 rounded-xl">
                  <Trophy className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Poster Presentations</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.poster_count}</p>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl">
                  <Award className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border-2 border-gray-100 p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg. Score</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {statistics.average_score.toFixed(2)}
                  </p>
                </div>
                <div className="p-3 bg-purple-50 rounded-xl">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-2xl border-2 border-gray-100 shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('overall')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'overall'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  Overall Ranking
                </span>
              </button>
              <button
                onClick={() => setActiveTab('subthemes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === 'subthemes'
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Sub-Theme Rankings
                </span>
              </button>
            </nav>
          </div>

          {/* Overall Ranking Content */}
          {activeTab === 'overall' && (
            <div className="p-6">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by title, reference, or author..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:border-teal-500 focus:ring-teal-500 outline-none"
                  />
                </div>
                <div className="flex gap-2">
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-500 focus:ring-teal-500 outline-none"
                  >
                    <option value="all">All Sub-Themes</option>
                    {subThemes.map(theme => (
                      <option key={theme} value={theme}>{theme}</option>
                    ))}
                  </select>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'rank' | 'score')}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium bg-white focus:border-teal-500 focus:ring-teal-500 outline-none"
                  >
                    <option value="rank">Sort by Rank</option>
                    <option value="score">Sort by Score</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                    className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  >
                    {sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                    <tr>
                      <th className="text-left px-4 py-3">Rank</th>
                      <th className="text-left px-4 py-3">Abstract</th>
                      <th className="text-left px-4 py-3">Sub-Theme</th>
                      <th className="text-left px-4 py-3">Score</th>
                      <th className="text-left px-4 py-3">Reviews</th>
                      <th className="text-left px-4 py-3">Presentation</th>
                      <th className="text-right px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAbstracts.map((item) => (
                      <tr key={item.abstract.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 text-white font-bold rounded-full text-sm">
                            {item.rank}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <p className="font-semibold text-gray-900">{item.abstract.title}</p>
                            <p className="text-xs text-gray-500">{item.abstract.reference}</p>
                            <p className="text-xs text-gray-400">
                              {item.abstract.authors.map(a => a.name).join(', ')}
                            </p>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-xs text-gray-600">{item.sub_theme}</span>
                        </td>
                        <td className="px-4 py-4">
                          <ScoreDisplay score={item.average_score} />
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {item.review_count} reviews
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge type={item.abstract.presentation_type as 'Oral' | 'Poster' || 'Either'} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => setSelectedAbstract(item)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="View details"
                            >
                              <Eye className="w-4 h-4 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleResendNotification(item.abstract.id)}
                              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                              title="Resend notification"
                            >
                              <Mail className="w-4 h-4 text-gray-600" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredAbstracts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-500">No abstracts found matching your filters.</p>
                </div>
              )}
            </div>
          )}

          {/* Sub-Theme Ranking Content */}
          {activeTab === 'subthemes' && rankings && (
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {subThemes.map((theme) => (
                  <div key={theme} className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Award className="w-5 h-5 text-teal-600" />
                      {theme}
                      <span className="text-sm font-normal text-gray-500">
                        Top {rankings.sub_themes[theme]?.length || 0}
                      </span>
                    </h3>
                    
                    <div className="space-y-3">
                      {rankings.sub_themes[theme]?.map((item) => (
                        <div
                          key={item.abstract.id}
                          className="bg-white rounded-xl p-4 border-2 border-gray-100 hover:border-teal-200 transition-colors cursor-pointer"
                          onClick={() => setSelectedAbstract(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="inline-flex items-center justify-center w-6 h-6 bg-teal-500 text-white text-xs font-bold rounded-full">
                                  {item.rank}
                                </span>
                                <p className="font-semibold text-gray-900 truncate">
                                  {item.abstract.title}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 mt-1">
                                {item.abstract.reference}
                              </p>
                            </div>
                            <ScoreDisplay score={item.average_score} size="sm" />
                          </div>
                          
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex gap-2">
                              <span className="text-xs text-gray-500">
                                {item.review_count} reviews
                              </span>
                              <StatusBadge 
                                type={item.abstract.presentation_type as 'Oral' | 'Poster' || 'Either'} 
                              />
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleResendNotification(item.abstract.id);
                              }}
                              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                            >
                              <Mail className="w-3.5 h-3.5 text-gray-400" />
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {(!rankings.sub_themes[theme] || rankings.sub_themes[theme].length === 0) && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          No abstracts ranked in this theme yet.
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Abstract Detail Modal */}
      {selectedAbstract && (
        <AbstractDetailModal
          abstract={selectedAbstract}
          onClose={() => setSelectedAbstract(null)}
          onResend={handleResendNotification}
        />
      )}
    </Layout>
  );
}