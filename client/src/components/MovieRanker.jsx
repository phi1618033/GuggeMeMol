import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

function SortableItem({ movie, rank, id, onInfoClick }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const imdbRating = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : null;
  const ratingClass = imdbRating
    ? parseFloat(imdbRating) >= 7 ? 'rating-good' : parseFloat(imdbRating) >= 5 ? 'rating-mid' : 'rating-bad'
    : '';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`ranker-item ${isDragging ? 'is-dragging' : ''}`}
    >
      <div className="ranker-body" onClick={() => onInfoClick?.(movie)}>
        <div className={`ranker-rank ${rank === 1 ? 'ranker-rank-1' : ''}`}>{rank}</div>
        {poster ? (
          <img src={poster} alt={movie.Title} className="ranker-poster" />
        ) : (
          <div className="ranker-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
        )}
        <div className="ranker-info">
          <div className="ranker-title">{movie.Title}</div>
          <div className="ranker-meta">
            <span>{movie.Year}</span>
            {movie.Genre && movie.Genre !== 'N/A' && <span>· {movie.Genre.split(',')[0]}</span>}
            {imdbRating && <span className={`ranker-rating ${ratingClass}`}>⭐ {imdbRating}</span>}
          </div>
        </div>
      </div>
      <div className="ranker-handle" {...attributes} {...listeners}>⠿</div>
    </div>
  );
}

function DragOverlayContent({ movie, rank }) {
  if (!movie) return null;
  const poster = movie.Poster && movie.Poster !== 'N/A' ? movie.Poster : null;
  const imdbRating = movie.imdbRating && movie.imdbRating !== 'N/A' ? movie.imdbRating : null;
  const ratingClass = imdbRating
    ? parseFloat(imdbRating) >= 7 ? 'rating-good' : parseFloat(imdbRating) >= 5 ? 'rating-mid' : 'rating-bad'
    : '';

  return (
    <div className="ranker-item-overlay" style={{ cursor: 'grabbing' }}>
      <div className={`ranker-rank ${rank === 1 ? 'ranker-rank-1' : ''}`}>{rank}</div>
      {poster ? (
        <img src={poster} alt={movie.Title} className="ranker-poster" />
      ) : (
        <div className="ranker-poster" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>🎬</div>
      )}
      <div className="ranker-info">
        <div className="ranker-title">{movie.Title}</div>
        <div className="ranker-meta">
          <span>{movie.Year}</span>
          {movie.Genre && movie.Genre !== 'N/A' && <span>· {movie.Genre.split(',')[0]}</span>}
          {imdbRating && <span className={`ranker-rating ${ratingClass}`}>⭐ {imdbRating}</span>}
        </div>
      </div>
    </div>
  );
}

export default function MovieRanker({ movies, onReorder, onMovieClick }) {
  const [activeId, setActiveId] = useState(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  const itemIds = movies.map((m) => m.imdbID);

  function handleDragStart(event) {
    setActiveId(event.active.id);
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = movies.findIndex((m) => m.imdbID === active.id);
      const newIndex = movies.findIndex((m) => m.imdbID === over.id);
      const reordered = arrayMove(movies, oldIndex, newIndex);
      onReorder(reordered);
    }
  }

  const activeMovie = activeId ? movies.find((m) => m.imdbID === activeId) : null;
  const activeRank = activeMovie ? movies.indexOf(activeMovie) + 1 : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
        <div className="ranker-list">
          {movies.map((movie, index) => (
            <SortableItem
              key={movie.imdbID}
              id={movie.imdbID}
              movie={movie}
              rank={index + 1}
              onInfoClick={onMovieClick}
            />
          ))}
        </div>
      </SortableContext>
      <DragOverlay>
        {activeMovie ? (
          <DragOverlayContent movie={activeMovie} rank={activeRank} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
