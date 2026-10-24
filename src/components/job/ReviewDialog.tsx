import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Star, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewDialogProps {
  jobId: string;
  reviewerId: string;
  revieweeId: string;
  revieweeName: string;
  hasReviewed: boolean;
}

const ReviewDialog = ({ jobId, reviewerId, revieweeId, revieweeName, hasReviewed }: ReviewDialogProps) => {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [comment, setComment] = useState("");
  const queryClient = useQueryClient();

  const submitReview = useMutation({
    mutationFn: async () => {
      if (rating === 0) throw new Error("Please select a rating");
      const { error } = await supabase.from("reviews").insert({
        job_id: jobId,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Review submitted!");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["job-reviews", jobId] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (hasReviewed) {
    return (
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Star className="w-3 h-3 fill-primary text-primary" />
        Review submitted
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Star className="w-3.5 h-3.5 mr-1" />
          Leave Review
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Rate {revieweeName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div>
            <Label>Rating *</Label>
            <div className="flex gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onMouseEnter={() => setHoveredRating(star)}
                  onMouseLeave={() => setHoveredRating(0)}
                  onClick={() => setRating(star)}
                  className="transition-transform hover:scale-110"
                >
                  <Star
                    className={cn(
                      "w-8 h-8 transition-colors",
                      (hoveredRating || rating) >= star
                        ? "fill-primary text-primary"
                        : "text-border"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Comment</Label>
            <Textarea
              placeholder="Share your experience..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="mt-1 min-h-[80px]"
              maxLength={500}
            />
          </div>
          <Button
            onClick={() => submitReview.mutate()}
            disabled={rating === 0 || submitReview.isPending}
            className="w-full bg-gradient-hero text-primary-foreground hover:opacity-90"
          >
            {submitReview.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              "Submit Review"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReviewDialog;
