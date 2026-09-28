package com.studygenie.backend.enums;

public enum ReviewRating {
    AGAIN(1),
    HARD(3),
    GOOD(4),
    EASY(5);

    private final int q;

    ReviewRating(int q) {
        this.q = q;
    }

    public int getQ() {
        return q;
    }
}
