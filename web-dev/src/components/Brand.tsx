import { Link } from 'react-router-dom';
import { Layers3 } from 'lucide-react';

export default function Brand() {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Multi Live Chat home">
      <span className="grid size-9 place-items-center rounded-xl border border-lilac/30 bg-lilac/10 text-lilac">
        <Layers3 size={19} />
      </span>
      <span className="text-sm font-bold tracking-tight">
        multi<span className="text-lilac">live</span>chat<span className="ml-1 text-lilac">.</span>
      </span>
    </Link>
  );
}
