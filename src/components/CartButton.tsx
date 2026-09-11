'use client';

import {useCart} from './CartProvider';

export default function CartButton() {
  const {itemCount, openDrawer} = useCart();

  return (
    <button
      onClick={openDrawer}
      aria-label="Open cart"
      className="relative rounded-md p-2 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        className="h-5 w-5"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.435M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 1.94-4.693 2.438-7.152.055-.27-.156-.51-.43-.51H5.106M7.5 14.25 5.106 5.106M7.5 14.25 8.25 18m0 0h9m-9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Zm9 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z"
        />
      </svg>
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-semibold text-white">
          {itemCount}
        </span>
      ) : null}
    </button>
  );
}
