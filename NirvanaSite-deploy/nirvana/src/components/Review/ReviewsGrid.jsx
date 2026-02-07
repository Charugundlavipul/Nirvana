import React, { useState, useEffect } from "react";
import ReviewCard from "./ReviewCard";
import styles from "./ReviewsGrid.module.css";
import { fetchReviews } from "../../lib/contentApi";
const ReviewsGrid = ({ slug }) => {
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoading(true);
        const data = slug ? await fetchReviews({ slug }) : [];
        setReviews(data);
      } catch (error) {
        console.error(`Error loading reviews for property ${slug}:`, error);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadReviews();
  }, [slug]);

  return (
    <div className={styles.reviewSlider}>
      <div className={styles.reviewContainer}>
        {isLoading ? (
          <p>Loading reviews...</p>
        ) : reviews.length > 0 ? (
          reviews.map((review) => <ReviewCard key={review.id} review={review} />)
        ) : (
          <p>No reviews available.</p>
        )}
      </div>
    </div>
  );
};



export default ReviewsGrid;
