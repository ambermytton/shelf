import { useState } from 'react';
import { useStore } from '../store/useStore';
import type { Item } from '../store/types';
import styles from './Stats.module.css';

// ─── Config ───────────────────────────────────────────────────────────────────

const TYPE_COLORS = {
  book:  '#298DFF',
  movie: '#B8B8C0',
  show:  '#555558',
} as const;

/** Rating bands for prediction accuracy. Adjust thresholds here. */
const FIT_BANDS = {
  good:    { min: 7,   max: 10  },
  partial: { min: 4,   max: 6.9 },
  poor:    { min: 0,   max: 3.9 },
} as const satisfies Record<string, { min: number; max: number }>;

/** Minimum rating gap to qualify as a surprise (hidden gem or disappointment). */
const SURPRISE_THRESHOLD = 1.5;

const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getFinishedYear(item: Item): number | null {
  if (!item.finishedAt) return null;
  return new Date(item.finishedAt).getFullYear();
}

function getAvailableYears(items: Item[]): number[] {
  const years = new Set<number>([new Date().getFullYear()]);
  items.forEach(i => { const y = getFinishedYear(i); if (y) years.add(y); });
  return [...years].sort((a, b) => b - a);
}

function topGenreList(items: Item[], n = 5): { label: string; count: number }[] {
  const counts: Record<string, number> = {};
  items.forEach(item =>
    (item.genres ?? []).forEach(g => { if (g) counts[g] = (counts[g] ?? 0) + 1; })
  );
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([label, count]) => ({ label, count }));
}

function fmtRuntime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function SectionEmpty({ text }: { text: string }) {
  return <p className={styles.sectionEmpty}>{text}</p>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Stats() {
  const { store } = useStore();
  const { items } = store;

  const availableYears = getAvailableYears(items);
  const [year, setYear] = useState(availableYears[0]);

  const allFinished    = items.filter(i => i.status === 'finished');
  const finishedInYear = allFinished.filter(i => getFinishedYear(i) === year);
  const inProgress     = items.filter(i => i.status === 'in_progress');
  const onShelf        = items.length;

  // ── Global empty ──────────────────────────────────────────────────────────
  if (allFinished.length === 0) {
    return (
      <main className={styles.page}>
        <div className={styles.empty}>
          <p className={styles.emptyEyebrow}>Year in review</p>
          <p className={styles.emptyHeading}>Finish some titles to see your stats.</p>
          <p className={styles.emptyBody}>
            Mark a book, film, or show as Finished and your numbers will appear here.
          </p>
        </div>
      </main>
    );
  }

  // ── Year nav ──────────────────────────────────────────────────────────────
  const yearIdx = availableYears.indexOf(year);
  const canPrev = yearIdx < availableYears.length - 1; // older year
  const canNext = yearIdx > 0;                          // newer year

  // ── Headline stats ────────────────────────────────────────────────────────
  const rated     = finishedInYear.filter(i => (i.userRating ?? 0) > 0);
  const avgRating = rated.length
    ? rated.reduce((s, i) => s + (i.userRating ?? 0), 0) / rated.length
    : null;

  // ── Finished by type ──────────────────────────────────────────────────────
  const byType = {
    book:  finishedInYear.filter(i => i.type === 'book').length,
    movie: finishedInYear.filter(i => i.type === 'movie').length,
    show:  finishedInYear.filter(i => i.type === 'show').length,
  };
  const maxByType = Math.max(...Object.values(byType), 1);

  // ── Monthly activity ──────────────────────────────────────────────────────
  const byMonth: number[] = Array(12).fill(0);
  const byMonthType = {
    book:  Array(12).fill(0) as number[],
    movie: Array(12).fill(0) as number[],
    show:  Array(12).fill(0) as number[],
  };
  finishedInYear.forEach(i => {
    if (!i.finishedAt) return;
    const m = new Date(i.finishedAt).getMonth();
    byMonth[m]++;
    if (i.type === 'book' || i.type === 'movie' || i.type === 'show') {
      byMonthType[i.type][m]++;
    }
  });
  const maxMonth = Math.max(...byMonth, 1);

  // ── Pages & hours ─────────────────────────────────────────────────────────
  const totalPages = finishedInYear
    .filter(i => i.type === 'book')
    .reduce((s, i) => s + (i.length.pages ?? 0), 0);

  const totalMinutes = finishedInYear
    .filter(i => i.type === 'movie' || i.type === 'show')
    .reduce((s, i) => {
      if (i.type === 'movie') return s + (i.length.runtimeMinutes ?? 0);
      // shows: per-episode runtime × total episodes
      return s + (i.length.runtimeMinutes ?? 0) * (i.length.episodes ?? 1);
    }, 0);

  // ── Top genres ────────────────────────────────────────────────────────────
  const genreList = topGenreList(finishedInYear);
  const maxGenre  = genreList[0]?.count ?? 1;

  // ── Highest rated ─────────────────────────────────────────────────────────
  const topRated = [...rated]
    .sort((a, b) => (b.userRating ?? 0) - (a.userRating ?? 0))
    .slice(0, 4);

  // ── Prediction accuracy ───────────────────────────────────────────────────
  const predictions = finishedInYear.filter(
    i => i.fit?.verdict != null && (i.userRating ?? 0) > 0
  );
  const predMatched = predictions.filter(i => {
    const band = FIT_BANDS[i.fit!.verdict as keyof typeof FIT_BANDS];
    if (!band) return false;
    const r = i.userRating ?? 0;
    return r >= band.min && r <= band.max;
  });
  const matchRate = predictions.length > 0
    ? Math.round((predMatched.length / predictions.length) * 100)
    : null;

  const verdictBreakdown = (['good', 'partial', 'poor'] as const)
    .map(v => {
      const total   = predictions.filter(i => i.fit!.verdict === v).length;
      const matched = predMatched.filter(i => i.fit!.verdict === v).length;
      return { verdict: v, total, matched };
    })
    .filter(({ total }) => total > 0);

  // ── Surprises ─────────────────────────────────────────────────────────────
  type ItemWithDiff = Item & { diff: number };
  const withDiff: ItemWithDiff[] = finishedInYear
    .filter(i => (i.userRating ?? 0) > 0 && i.sourceRating != null)
    .map(i => ({ ...i, diff: (i.userRating ?? 0) - (i.sourceRating ?? 0) }));

  const hiddenGems      = [...withDiff].sort((a, b) => b.diff - a.diff).filter(i => i.diff >=  SURPRISE_THRESHOLD).slice(0, 3);
  const disappointments = [...withDiff].sort((a, b) => a.diff - b.diff).filter(i => i.diff <= -SURPRISE_THRESHOLD).slice(0, 3);
  const hasSurprises    = hiddenGems.length > 0 || disappointments.length > 0;

  // ── Notes ─────────────────────────────────────────────────────────────────
  const notedItems = finishedInYear
    .filter(i => i.notes && i.notes.trim().length > 0)
    .sort((a, b) => new Date(b.finishedAt!).getTime() - new Date(a.finishedAt!).getTime())
    .slice(0, 4);

  const want = items.filter(i => i.status === 'want');

  return (
    <main className={styles.page}>

      {/* ── Header + year picker ── */}
      <div className={styles.header}>
        <p className={styles.eyebrow}>Year in review</p>
        <div className={styles.yearRow}>
          <h1 className={styles.heading}>{year}</h1>
          <div className={styles.yearPicker}>
            <button
              className={styles.yearArrow}
              onClick={() => setYear(availableYears[yearIdx + 1])}
              disabled={!canPrev}
              aria-label="Previous year"
            >←</button>
            <button
              className={styles.yearArrow}
              onClick={() => setYear(availableYears[yearIdx - 1])}
              disabled={!canNext}
              aria-label="Next year"
            >→</button>
          </div>
        </div>
      </div>

      {/* ── Headline tiles ── */}
      <div className={styles.headlineRow}>
        <div className={styles.statCard}>
          <span className={styles.statNum}>{finishedInYear.length}</span>
          <span className={styles.statLabel}>Finished in {year}</span>
        </div>
        <div className={styles.statCard}>
          <span className={styles.statNum}>
            {avgRating != null ? `${avgRating.toFixed(1).replace(/\.0$/, '')}/10` : '—'}
          </span>
          <span className={styles.statLabel}>Avg rating</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardLive}`}>
          <span className={styles.liveTag}>Live</span>
          <span className={styles.statNum}>{onShelf}</span>
          <span className={styles.statLabel}>On shelf</span>
        </div>
        <div className={`${styles.statCard} ${styles.statCardLive}`}>
          <span className={styles.liveTag}>Live</span>
          <span className={styles.statNum}>{inProgress.length}</span>
          <span className={styles.statLabel}>In progress</span>
        </div>
      </div>

      {/* ── 2-column grid ── */}
      <div className={styles.grid}>

        {/* Finished by type */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Finished by type</p>
          {Object.values(byType).every(v => v === 0) ? (
            <SectionEmpty text={`No titles finished in ${year}.`} />
          ) : (
            <div className={styles.typeRows}>
              {([ ['Books', 'book', byType.book], ['Films', 'movie', byType.movie], ['Shows', 'show', byType.show] ] as [string, keyof typeof TYPE_COLORS, number][])
                .filter(([,, n]) => n > 0)
                .map(([label, key, n]) => (
                  <div key={label} className={styles.typeRow}>
                    <span className={styles.typeLabel} style={{ color: TYPE_COLORS[key] }}>{label}</span>
                    <div className={styles.barTrack}>
                      <div className={styles.barFill} style={{ width: `${(n / maxByType) * 100}%`, background: TYPE_COLORS[key] }} />
                    </div>
                    <span className={styles.typeCount}>{n}</span>
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Activity chart */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Activity {year}</p>
          {finishedInYear.length === 0 ? (
            <SectionEmpty text={`No activity recorded in ${year}.`} />
          ) : (
            <>
              <div className={styles.monthChart}>
                {byMonth.map((total, i) => {
                  const bk = byMonthType.book[i];
                  const mv = byMonthType.movie[i];
                  const sh = byMonthType.show[i];
                  return (
                    <div key={i} className={styles.monthCol}>
                      <div className={styles.monthBarWrap}>
                        {total > 0 && (
                          <div
                            className={styles.monthStack}
                            style={{ height: `${(total / maxMonth) * 100}%` }}
                            title={`${total} finished`}
                          >
                            {bk > 0 && <div style={{ flex: bk, background: TYPE_COLORS.book  }} />}
                            {mv > 0 && <div style={{ flex: mv, background: TYPE_COLORS.movie }} />}
                            {sh > 0 && <div style={{ flex: sh, background: TYPE_COLORS.show  }} />}
                          </div>
                        )}
                      </div>
                      <span className={styles.monthLabel}>{MONTHS[i]}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.legend}>
                {byType.book  > 0 && <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: TYPE_COLORS.book  }} />Books</span>}
                {byType.movie > 0 && <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: TYPE_COLORS.movie }} />Films</span>}
                {byType.show  > 0 && <span className={styles.legendItem}><span className={styles.legendDot} style={{ background: TYPE_COLORS.show  }} />Shows</span>}
              </div>
            </>
          )}
        </div>

        {/* Pages & hours */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Pages &amp; hours</p>
          {totalPages === 0 && totalMinutes === 0 ? (
            <SectionEmpty text={`No reading or viewing data for ${year}.`} />
          ) : (
            <div className={styles.pagesHours}>
              {totalPages > 0 && (
                <div className={styles.phItem}>
                  <span className={styles.phNum} style={{ color: TYPE_COLORS.book }}>
                    {totalPages.toLocaleString()}
                  </span>
                  <span className={styles.phLabel}>pages read</span>
                </div>
              )}
              {totalMinutes > 0 && (
                <div className={styles.phItem}>
                  <span className={styles.phNum} style={{ color: TYPE_COLORS.movie }}>
                    {fmtRuntime(totalMinutes)}
                  </span>
                  <span className={styles.phLabel}>films &amp; shows watched</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Top genres */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Top genres</p>
          {genreList.length === 0 ? (
            <SectionEmpty text={`No genre data for ${year}.`} />
          ) : (
            <div className={styles.genreRows}>
              {genreList.map(({ label, count }) => (
                <div key={label} className={styles.genreRow}>
                  <span className={styles.genreLabel}>{label}</span>
                  <div className={styles.barTrack}>
                    <div className={`${styles.barFill} ${styles.barFillAccent}`} style={{ width: `${(count / maxGenre) * 100}%` }} />
                  </div>
                  <span className={styles.typeCount}>{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Prediction accuracy */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Prediction accuracy</p>
          {matchRate === null ? (
            <SectionEmpty text="Rate finished titles to see how well fit verdicts predicted your enjoyment." />
          ) : (
            <div className={styles.predSection}>
              <div className={styles.predHeadline}>
                <span className={styles.predRate}>{matchRate}%</span>
                <span className={styles.predCount}>
                  {predMatched.length} of {predictions.length} prediction{predictions.length !== 1 ? 's' : ''} matched
                </span>
              </div>

              {verdictBreakdown.length > 0 && (
                <div className={styles.predBreakdown}>
                  {verdictBreakdown.map(({ verdict, matched, total }) => (
                    <div key={verdict} className={styles.predRow}>
                      <span className={styles.predVerdict}>{verdict}</span>
                      <div className={styles.barTrack}>
                        <div className={styles.barFill} style={{
                          width: `${(matched / total) * 100}%`,
                          background: verdict === 'good' ? '#1aae39' : verdict === 'partial' ? '#dd5b00' : '#e5534b',
                        }} />
                      </div>
                      <span className={styles.typeCount}>{matched}/{total}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className={styles.bandKey}>
                {([ ['good', '#1aae39'], ['partial', '#dd5b00'], ['poor', '#e5534b'] ] as [keyof typeof FIT_BANDS, string][]).map(([v, color]) => (
                  <span key={v} className={styles.bandItem}>
                    <span className={styles.bandDot} style={{ background: color }} />
                    {v} {FIT_BANDS[v].min}–{FIT_BANDS[v].max}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Highest rated */}
        <div className={styles.card}>
          <p className={styles.cardLabel}>Highest rated</p>
          {topRated.length === 0 ? (
            <SectionEmpty text={`No rated titles for ${year}.`} />
          ) : (
            <ul className={styles.topList}>
              {topRated.map(item => (
                <li key={item.id} className={styles.topItem}>
                  <span
                    className={styles.typeBar}
                    style={{ background: TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.movie }}
                    aria-hidden
                  />
                  {item.coverUrl && (
                    <img src={item.coverUrl} alt="" className={styles.topThumb} />
                  )}
                  <div className={styles.topInfo}>
                    <p className={styles.topTitle}>{item.title}</p>
                    <p className={styles.topMeta}>{item.creator}</p>
                  </div>
                  <span
                    className={styles.topRating}
                    style={{ color: TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.movie }}
                  >
                    {item.userRating} / 10
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* ── Surprises (full-width) ── */}
      {hasSurprises && (
        <div className={styles.fullCard}>
          <p className={styles.cardLabel}>Surprises</p>
          <div className={styles.surprisesGrid}>

            <div className={styles.surpriseGroup}>
              <p className={styles.surpriseGroupLabel}>Hidden gems</p>
              <p className={styles.surpriseGroupSub}>You rated these much higher than the community</p>
              {hiddenGems.length === 0
                ? <SectionEmpty text="No hidden gems this year." />
                : (
                  <div className={styles.surpriseList}>
                    {hiddenGems.map(item => (
                      <div key={item.id} className={styles.surpriseItem}>
                        {item.coverUrl && <img src={item.coverUrl} alt="" className={styles.surpriseThumb} />}
                        <div className={styles.surpriseInfo}>
                          <p className={styles.surpriseTitle}>{item.title}</p>
                          <p className={styles.surpriseMeta}>{item.creator}</p>
                        </div>
                        <div className={styles.surpriseDiffs}>
                          <span className={styles.surpriseYours} style={{ color: TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.movie }}>
                            {item.userRating}/10
                          </span>
                          <span className={styles.surpriseCommunity}>community {item.sourceRating?.toFixed(1)}/10</span>
                          <span className={styles.diffGem}>+{item.diff.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

            <div className={styles.surpriseGroup}>
              <p className={styles.surpriseGroupLabel}>Disappointments</p>
              <p className={styles.surpriseGroupSub}>You rated these much lower than the community</p>
              {disappointments.length === 0
                ? <SectionEmpty text="No disappointments this year." />
                : (
                  <div className={styles.surpriseList}>
                    {disappointments.map(item => (
                      <div key={item.id} className={styles.surpriseItem}>
                        {item.coverUrl && <img src={item.coverUrl} alt="" className={styles.surpriseThumb} />}
                        <div className={styles.surpriseInfo}>
                          <p className={styles.surpriseTitle}>{item.title}</p>
                          <p className={styles.surpriseMeta}>{item.creator}</p>
                        </div>
                        <div className={styles.surpriseDiffs}>
                          <span className={styles.surpriseYours} style={{ color: TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.movie }}>
                            {item.userRating}/10
                          </span>
                          <span className={styles.surpriseCommunity}>community {item.sourceRating?.toFixed(1)}/10</span>
                          <span className={styles.diffDud}>{item.diff.toFixed(1)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>

          </div>
        </div>
      )}

      {/* ── Notes & lessons (full-width) ── */}
      {notedItems.length > 0 && (
        <div className={styles.fullCard}>
          <p className={styles.cardLabel}>Notes &amp; lessons</p>
          <div className={styles.noteCards}>
            {notedItems.map(item => (
              <div key={item.id} className={styles.noteCard}>
                <p className={styles.noteQuote}>{item.notes}</p>
                <div className={styles.noteAttrib}>
                  <span
                    className={styles.noteTypeDot}
                    style={{ background: TYPE_COLORS[item.type as keyof typeof TYPE_COLORS] ?? TYPE_COLORS.movie }}
                  />
                  <span className={styles.noteTitle}>{item.title}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {want.length > 0 && (
        <p className={styles.footer}>
          {want.length} title{want.length !== 1 ? 's' : ''} still on your list
        </p>
      )}

    </main>
  );
}
