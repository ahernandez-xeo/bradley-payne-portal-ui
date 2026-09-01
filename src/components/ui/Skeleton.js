import classes from "./ui.module.scss";

/** Shimmer block used as a placeholder while real content loads. */
export const Skeleton = ({ width = "100%", height = 14, radius = "var(--radius-sm)" }) => (
  <span
    className={classes.skeleton}
    style={{ width, height, borderRadius: radius }}
    aria-hidden="true"
  />
);

/**
 * Skeleton table body. Keeps the column count so the header does not jump when
 * real rows arrive.
 */
export const SkeletonRows = ({ rows = 5, columns = 4, widths }) => (
  <>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <tr key={rowIndex}>
        {Array.from({ length: columns }).map((__, colIndex) => (
          <td key={colIndex}>
            <Skeleton width={widths?.[colIndex] || "70%"} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

export default Skeleton;
