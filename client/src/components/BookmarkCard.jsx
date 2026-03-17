import { useRef, useEffect, useState, useCallback } from 'react';

const CATEGORY_COLORS = {
  Design: '#a78bfa', Tech: '#60a5fa', Music: '#f472b6',
  Writing: '#fbbf24', Food: '#fb923c', Travel: '#34d399',
  Fitness: '#f87171', Inspiration: '#e879f9', Art: '#c084fc',
  Business: '#94a3b8', Learning: '#38bdf8', Entertainment: '#fb7185',
};

const PROXY = '';

function proxyVideo(url) {
  return url ? `${PROXY}/proxy/video?url=${encodeURIComponent(url)}` : null;
}
function proxyImage(url) {
  if (!url) return null;
  return url.includes('twimg.com') ? `${PROXY}/proxy/image?url=${encodeURIComponent(url)}` : url;
}

export default function BookmarkCard({ bookmark, onDelete }) {
  const videoRef = useRef(null);
  const [imgError, setImgError] = useState(false);
  const [hovered, setHovered] = useState(false);

  const hasVideo = !!bookmark.video_url;
  const hasImage = !imgError && !!(bookmark.media_url || bookmark.link_image);
  const hasMedia = hasVideo || hasImage;
  const catColor = CATEGORY_COLORS[bookmark.category] || '#555';
  const tweetUrl = `https://twitter.com/${bookmark.author_username}/status/${bookmark.tweet_id}`;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const play = () => v.play().catch(() => {});
    play();
    v.addEventListener('canplay', play);
    v.addEventListener('loadeddata', play);
    return () => {
      v.removeEventListener('canplay', play);
      v.removeEventListener('loadeddata', play);
    };
  }, []);

  const handleClick = useCallback(() => {
    window.open(tweetUrl, '_blank', 'noopener,noreferrer');
  }, [tweetUrl]);

  const handleDelete = useCallback((e) => {
    e.stopPropagation();
    e.preventDefault();
    onDelete(bookmark.id);
  }, [bookmark.id, onDelete]);

  return (
    <div
      className="card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleClick}
    >
      {hasVideo && (
        <video
          ref={videoRef}
          className="card-media"
          src={proxyVideo(bookmark.video_url)}
          poster={proxyImage(bookmark.media_url) || undefined}
          muted loop playsInline autoPlay preload="auto"
          draggable={false}
        />
      )}

      {!hasVideo && hasImage && (
        <img
          className="card-media"
          src={proxyImage(bookmark.media_url || bookmark.link_image)}
          alt=""
          draggable={false}
          onError={() => setImgError(true)}
        />
      )}

      {!hasMedia && (
        <div className="card-text-body">
          <p className="card-text-content">{bookmark.text}</p>
        </div>
      )}

      {hovered && (
        <div className="card-overlay">
          <div className="overlay-top">
            <button className="delete-btn" onClick={handleDelete} title="Delete">✕</button>
          </div>
          <div className="overlay-bottom">
            {bookmark.author_image && (
              <img className="overlay-avatar" src={proxyImage(bookmark.author_image)} alt="" draggable={false} />
            )}
            <div className="overlay-author">
              <span className="overlay-name">{bookmark.author_name}</span>
              <span className="overlay-handle">@{bookmark.author_username}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
