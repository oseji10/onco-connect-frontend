import React, { useEffect, useState } from "react";
import { Button } from "@roketid/windmill-react-ui";
import { Star, Send, ThumbsUp, Award, CheckCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageTitle from "../components/Typography/PageTitle";
import api from "../../lib/api";

type MealSession = {
  mealSessionId: number;
  mealSessionTitle: string;
  mealDate: string;
  foodItems: string[];
  vendors: string[];
};

// Generate device fingerprint (same as before)
function generateDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("fingerprint", 2, 2);
  }
  const canvasData = canvas.toDataURL();

  const fingerprint = [
    navigator.userAgent,
    navigator.language,
    new Date().getTimezoneOffset(),
    screen.width + "x" + screen.height,
    screen.colorDepth,
    canvasData,
  ].join("|");

  let hash = 0;
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  return Math.abs(hash).toString(36);
}

export default function MealRatingPage() {
  const [availableMeals, setAvailableMeals] = useState<MealSession[]>([]);
  const [selectedMeal, setSelectedMeal] = useState<number | null>(null);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    loadAvailableMeals();
  }, []);

  async function loadAvailableMeals() {
    try {
      const { data } = await api.get("/meals/sessions/rateable");
      setAvailableMeals(data.meals || []);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to load available meals"
      );
    }
  }

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedMeal) {
      toast.error("Please select a meal to rate");
      return;
    }

    if (rating === 0) {
      toast.error("Please select a star rating");
      return;
    }

    try {
      setLoading(true);

      const deviceFingerprint = generateDeviceFingerprint();

      const { data } = await api.post("/meals/ratings", {
        mealSessionId: selectedMeal,
        rating,
        comment: comment.trim(),
        deviceFingerprint,
      });

      setSubmitted(true);
      toast.success(data.message || "Thank you for your feedback!");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit rating"
      );
    } finally {
      setLoading(false);
    }
  }

  // Thank you screen (same style as staff feedback)
  if (submitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="text-center max-w-md mx-auto">
          <div className="w-24 h-24 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50 dark:ring-green-900/10">
            <CheckCircle className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-3">
            Thank you for your feedback!
          </h2>
          <p className="text-gray-500 dark:text-gray-400 leading-relaxed mb-6">
            Your rating has been recorded and will help us improve our meal service.
          </p>
          <Button
            onClick={() => {
              setSubmitted(false);
              setSelectedMeal(null);
              setRating(0);
              setComment("");
              loadAvailableMeals();
            }}
            className="rounded-2xl h-12 bg-green-700 border-green-700 hover:bg-green-800 hover:border-green-800"
          >
            Return Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="mb-6 px-5">
        <PageTitle>Rate Your Meals</PageTitle>

        <div className="rounded-3xl bg-gradient-to-r from-green-900 via-green-800 to-green-700 text-white shadow-xl p-6 sm:p-8 mb-8">
          <div className="max-w-3xl">
            <div className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold tracking-wide uppercase">
              Participant Feedback
            </div>

            <h2 className="mt-3 text-xl sm:text-3xl font-bold leading-tight">
              Your opinion helps us improve
            </h2>

            <p className="mt-2 text-xs sm:text-base text-slate-200 leading-6">
              Rate the quality, taste, and overall experience of each meal
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr,0.6fr] px-5">
        <div className="rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Submit New Rating
          </h3>

          {availableMeals.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">
                No meals available to rate
              </p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Check back later when meals have been served
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmitRating} className="space-y-6">
              {/* Meal Selection */}
              <div>
                <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select Meal to Rate *
                </label>
                <div className="space-y-3">
                  {availableMeals.map((meal) => (
                    <div
                      key={meal.mealSessionId}
                      onClick={() => setSelectedMeal(meal.mealSessionId)}
                      className={`rounded-2xl border-2 p-4 cursor-pointer transition-all ${
                        selectedMeal === meal.mealSessionId
                          ? "border-green-600 bg-green-50 dark:bg-green-900/10"
                          : "border-gray-200 dark:border-gray-700 hover:border-green-300"
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            {meal.mealSessionTitle}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {meal.vendors?.join(", ") || "N/A"} •{" "}
                            {meal.foodItems?.join(", ") || "N/A"}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {new Date(meal.mealDate).toLocaleDateString("en-GB")}
                          </p>
                        </div>
                        {selectedMeal === meal.mealSessionId && (
                          <div className="rounded-full bg-green-600 p-1">
                            <ThumbsUp className="w-4 h-4 text-white" />
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {selectedMeal && (
                <>
                  {/* Star Rating */}
                  <div>
                    <label className="block mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Your Rating *
                    </label>
                    <div className="flex items-center justify-center gap-2 py-6 bg-gray-50 dark:bg-gray-900/30 rounded-2xl">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          onMouseEnter={() => setHoverRating(star)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform hover:scale-110 focus:outline-none"
                        >
                          <Star
                            className={`w-12 h-12 transition-colors ${
                              star <= (hoverRating || rating)
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300 dark:text-gray-600"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-center mt-3 text-lg font-medium text-gray-700 dark:text-gray-300">
                        {rating === 5 && "Excellent! ⭐"}
                        {rating === 4 && "Very Good! 👍"}
                        {rating === 3 && "Good 😊"}
                        {rating === 2 && "Fair 😐"}
                        {rating === 1 && "Needs Improvement 😔"}
                      </p>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Comments (Optional)
                    </label>
                    <textarea
                      className="w-full px-4 py-3 rounded-2xl border-2 border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-green-600 focus:ring-0 transition-colors"
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Tell us what you think about this meal... (taste, portion, quality, etc.)"
                    />
                  </div>

                  {/* Submit */}
                  <Button
                    type="submit"
                    disabled={loading || rating === 0}
                    className="w-full rounded-2xl h-12 bg-green-600 border-green-600 hover:bg-green-700 hover:border-green-700"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      {loading ? "Submitting..." : "Submit Rating"}
                    </span>
                  </Button>
                </>
              )}
            </form>
          )}
        </div>
      </div>

      {/* Rating Guide */}
      <div className="mt-5 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-lg p-4 sm:p-5 mx-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Rating Guide
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[
            { stars: 5, label: "Excellent", desc: "Outstanding quality" },
            { stars: 4, label: "Very Good", desc: "Above expectations" },
            { stars: 3, label: "Good", desc: "Meets expectations" },
            { stars: 2, label: "Fair", desc: "Below expectations" },
            { stars: 1, label: "Poor", desc: "Needs improvement" },
          ].map((item) => (
            <div
              key={item.stars}
              className="rounded-2xl border border-gray-100 dark:border-gray-700 p-3 text-center"
            >
              <div className="flex items-center justify-center gap-0.5 mb-2">
                {[...Array(item.stars)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">
                {item.label}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}