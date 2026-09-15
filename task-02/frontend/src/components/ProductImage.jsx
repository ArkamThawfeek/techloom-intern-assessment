import { useState } from 'react';
import { Package } from 'lucide-react';

export default function ProductImage({ src, alt, size = 28, style }) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="product-thumb" style={style}>
      {src && !failed ? (
        <img
          src={src}
          alt={alt || ''}
          onError={() => setFailed(true)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 'inherit' }}
        />
      ) : (
        <Package size={size} />
      )}
    </div>
  );
}
