import React, { useState, useEffect } from 'react';
import { Star, MessageSquarePlus, X, Heart } from 'lucide-react';
import { Feedback } from '../types';

const INITIAL_REVIEWS: Feedback[] = [];

export default function FeedbackSection() {
  const [reviews, setReviews] = useState<Feedback[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [authorName, setAuthorName] = useState('');
  const [rating, setRating] = useState(5);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const availableTags = ['Hair Details', 'Easy to Use', 'Product Shots', 'Ultra Fast', 'Manual Brush', 'Accurate', '100% Free'];

  // Load reviews from localStorage or initial list
  useEffect(() => {
    const saved = localStorage.getItem('aaroine_reviews');
    if (saved) {
      try {
        setReviews(JSON.parse(saved));
      } catch (e) {
        setReviews(INITIAL_REVIEWS);
      }
    } else {
      setReviews(INITIAL_REVIEWS);
      localStorage.setItem('aaroine_reviews', JSON.stringify(INITIAL_REVIEWS));
    }
  }, []);

  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!authorName.trim() || !comment.trim()) return;

    const newReview: Feedback = {
      id: `rev-${Date.now()}`,
      author: authorName,
      rating,
      comment,
      tags: selectedTags,
      createdTime: new Date().toISOString(),
    };

    const updated = [newReview, ...reviews];
    setReviews(updated);
    localStorage.setItem('aaroine_reviews', JSON.stringify(updated));

    // Reset Form
    setAuthorName('');
    setRating(5);
    setComment('');
    setSelectedTags([]);
    setIsModalOpen(false);

    // Show feedback toast
    setShowSuccessToast(true);
    setTimeout(() => setShowSuccessToast(false), 3000);
  };

  return (
    <section className="py-20 px-6 sm:px-8 bg-slate-50/50 border-t border-slate-100">
      <div className="mx-auto max-w-5xl text-center">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">
          Loved our tool?
        </h2>
        <p className="mt-4 text-slate-600 text-sm max-w-xl mx-auto leading-relaxed">
          Share your experience with the community. Your feedback helps us keep Aaroine free and powerful.
        </p>

        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all cursor-pointer"
        >
          <MessageSquarePlus className="h-4 w-4" />
          Give a Rating
        </button>

        {/* Live Feedback Feed Grid */}
        {reviews.length === 0 ? (
          <div className="mt-12 rounded-2xl border border-dashed border-slate-200 bg-white/70 p-12 max-w-xl mx-auto text-center shadow-sm">
            <Heart className="h-8 w-8 text-rose-400 mx-auto mb-4 stroke-[1.5]" />
            <span className="block text-sm font-bold text-slate-800">No community ratings or reviews yet.</span>
            <span className="block text-xs text-slate-500 mt-2 max-w-sm mx-auto">
              We cleared the preloaded templates. Be the first user of our app to share your authentic feedback with everyone!
            </span>
          </div>
        ) : (
          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 text-left">
            {reviews.slice(0, 6).map((rev) => (
              <div 
                key={rev.id} 
                className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow"
              >
                <div>
                  {/* Stars and date */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-4 w-4 ${
                            star <= rev.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(rev.createdTime).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Comment */}
                  <p className="text-sm text-slate-600 leading-relaxed italic mb-4">
                    "{rev.comment}"
                  </p>
                </div>

                <div>
                  {/* Author Info */}
                  <p className="font-semibold text-sm text-slate-900 mb-2">
                    {rev.author}
                  </p>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1.5">
                    {rev.tags.map((tag) => (
                      <span 
                        key={tag} 
                        className="rounded-full bg-slate-100 px-2.5 py-0.5 text-2xs font-medium text-slate-600"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal Dialog */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h3 className="text-lg font-bold text-slate-900">Write Your Feedback</h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Form Entry */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Name */}
                <div>
                  <label htmlFor="author-name" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Your Name
                  </label>
                  <input
                    id="author-name"
                    type="text"
                    required
                    placeholder="e.g. Rachel Green"
                    value={authorName}
                    onChange={(e) => setAuthorName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Stars Selection */}
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Rating
                  </span>
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="p-0.5 transition-transform active:scale-95 cursor-pointer"
                      >
                        <Star
                          className={`h-7 w-7 transition-colors ${
                            star <= (hoveredRating ?? rating)
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-slate-200'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags Picker */}
                <div>
                  <span className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Select Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {availableTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleTagToggle(tag)}
                          className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors cursor-pointer ${
                            isSelected 
                              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comment Box */}
                <div>
                  <label htmlFor="comment" className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Review / Share your thoughts
                  </label>
                  <textarea
                    id="comment"
                    required
                    rows={4}
                    placeholder="Tell us what you loved about Aaroine..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors cursor-pointer"
                  >
                    Post Review
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-white shadow-lg animate-in slide-in-from-bottom-5">
            <Heart className="h-5 w-5 text-rose-400 fill-rose-400" />
            <span className="text-sm font-semibold">Thank you for rating Aaroine!</span>
          </div>
        )}

      </div>
    </section>
  );
}
