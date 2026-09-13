import React from 'react';
import styles from './Pagination.module.css';

/**
 * Reusable Pagination Component
 * @param {number} currentPage - Current active page (1-indexed)
 * @param {number} totalPages - Total number of pages
 * @param {function} onPageChange - Callback when a page is selected
 * @param {number} [maxVisible=5] - Max number of page buttons shown
 */
export default function Pagination({
    currentPage,
    totalPages,
    onPageChange,
    maxVisible = 5,
    floatingOnMobile = false,
    onInteraction
}) {

    const getPageNumbers = () => {
        const pages = [];
        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
        let end = start + maxVisible - 1;

        if (end > totalPages) {
            end = totalPages;
            start = Math.max(1, end - maxVisible + 1);
        }

        for (let i = start; i <= end; i++) {
            pages.push(i);
        }
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <div
            className={`${styles.pagination} ${floatingOnMobile ? styles.floatingOnMobile : ''}`}
            onPointerDown={onInteraction}
            onPointerMove={onInteraction}
            onClickCapture={onInteraction}
            onFocusCapture={onInteraction}
        >
            <button
                className={`${styles.pageBtn} ${styles.edgePageBtn}`}
                onClick={() => onPageChange(1)}
                disabled={currentPage === 1}
                title="Trang đầu"
            >
                «
            </button>
            <button
                className={`${styles.pageBtn} ${styles.previousPageBtn}`}
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                title="Trang trước"
            >
                ‹
            </button>

            {pageNumbers[0] > 1 && (
                <>
                    <button className={`${styles.pageBtn} ${styles.overflowPageBtn}`} onClick={() => onPageChange(1)}>1</button>
                    {pageNumbers[0] > 2 && <span className={styles.ellipsis}>…</span>}
                </>
            )}

            {pageNumbers.map(page => (
                <button
                    key={page}
                    className={`${styles.pageBtn} ${page === currentPage ? styles.active : ''}`}
                    onClick={() => onPageChange(page)}
                >
                    {page}
                </button>
            ))}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
                <>
                    {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                        <span className={styles.ellipsis}>…</span>
                    )}
                    <button className={`${styles.pageBtn} ${styles.overflowPageBtn}`} onClick={() => onPageChange(totalPages)}>
                        {totalPages}
                    </button>
                </>
            )}

            <button
                className={`${styles.pageBtn} ${styles.nextPageBtn}`}
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                title="Trang sau"
            >
                ›
            </button>
            <button
                className={`${styles.pageBtn} ${styles.edgePageBtn}`}
                onClick={() => onPageChange(totalPages)}
                disabled={currentPage === totalPages}
                title="Trang cuối"
            >
                »
            </button>

            <span className={styles.pageInfo}>
                Trang <strong>{currentPage}</strong> / <strong>{totalPages}</strong>
            </span>
        </div>
    );
}
