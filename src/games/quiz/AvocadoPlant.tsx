import { useId } from 'react';

// Long, hanging blades in scene coordinates, following the personal photo.
const leaves = [
  { step: 2, stem: 'M250 414 Q234 396 218 410', shape: 'M218 410 C182 406 143 433 145 475 C146 499 148 518 137 543 C165 528 196 509 209 479 C221 452 225 432 218 410Z', vein: 'M218 412 C183 447 164 489 140 539', side: 'M199 436 Q175 435 163 450 M184 458 Q163 457 151 470 M169 486 Q157 483 149 487' },
  { step: 3, stem: 'M250 387 Q241 371 235 387', shape: 'M235 387 C211 401 205 440 222 469 C233 486 245 510 240 535 C263 509 280 482 275 446 C270 416 250 395 235 387Z', vein: 'M235 389 C247 433 254 483 241 530', side: 'M241 414 Q224 421 216 438 M247 441 Q267 447 274 462 M248 470 Q234 474 232 484' },
  { step: 4, stem: 'M250 354 Q230 347 211 362', shape: 'M211 362 C163 359 108 393 100 441 C96 466 101 488 89 517 C126 501 157 474 181 438 C203 408 218 384 211 362Z', vein: 'M209 364 C166 409 122 458 93 512', side: 'M181 392 Q149 393 128 410 M154 424 Q122 429 106 444 M124 464 Q110 467 99 479' },
  { step: 6, stem: 'M250 299 Q247 281 257 295', shape: 'M257 295 C222 302 210 347 221 393 C228 421 246 445 244 473 C275 447 295 409 297 372 C301 333 280 303 257 295Z', vein: 'M257 297 C269 349 274 406 245 469', side: 'M261 323 Q237 332 222 349 M264 350 Q285 357 295 372 M264 381 Q241 392 233 407 M258 414 Q278 412 285 403' },
  { step: 7, stem: 'M250 270 Q224 253 203 277', shape: 'M203 277 C153 272 89 300 74 354 C68 381 69 410 53 445 C88 428 119 403 142 364 C162 330 193 305 203 277Z', vein: 'M201 279 C150 312 101 365 57 439', side: 'M171 299 Q139 297 114 315 M140 327 Q107 329 86 348 M109 365 Q87 372 73 389' },
  { step: 8, stem: 'M250 231 Q274 216 303 230', shape: 'M303 230 C362 225 423 260 441 305 C450 329 447 357 463 382 C423 361 393 333 370 304 C347 277 321 258 303 230Z', vein: 'M305 232 C356 258 416 317 459 377', side: 'M340 251 Q377 248 401 266 M372 279 Q406 282 430 305 M409 319 Q437 324 445 342' },
  { step: 9, stem: 'M250 181 Q243 157 230 161', shape: 'M230 161 C200 144 166 157 154 183 C144 209 146 236 128 256 C158 246 190 229 210 201 C225 182 231 173 230 161Z', vein: 'M229 162 Q174 190 132 252', side: 'M208 174 Q189 166 177 170 M187 195 Q166 191 153 199 M165 222 L146 221' },
  { step: 10, stem: 'M250 151 Q274 133 301 145', shape: 'M301 145 C346 129 398 144 430 168 C449 183 460 199 480 218 C443 208 412 195 379 182 C348 169 318 164 301 145Z', vein: 'M303 146 C361 151 425 184 475 214', side: 'M333 151 L354 137 M363 161 Q389 151 410 156 M396 177 Q424 172 442 181' },
];

// Growth order and drawing order are independent. Front-facing blades cover the stem;
// narrower, darker rear blades sit behind it instead of forming a flat left/right fan.
const arrangement: Record<number, { layer: 'back' | 'side' | 'front'; node: number; transform?: string }> = {
  2: { layer: 'back', node: 414, transform: 'translate(250 414) scale(.7 .88) translate(-250 -414)' },
  3: { layer: 'front', node: 387 },
  4: { layer: 'side', node: 354 },
  6: { layer: 'front', node: 299 },
  7: { layer: 'back', node: 270, transform: 'matrix(.8 0 .3 .87 -31 35.1)' },
  8: { layer: 'side', node: 231, transform: 'translate(250 231) scale(.9 1) translate(-250 -231)' },
  9: { layer: 'back', node: 181 },
  10: { layer: 'side', node: 151, transform: 'translate(250 151) scale(.8 1.1) translate(-250 -151)' },
};

export function AvocadoPlant({ growth }: { growth: number }) {
  const id = useId().replace(/:/g, '');
  const tip = growth >= 9 ? 148 : growth >= 8 ? 228 : growth >= 6 ? 267 : growth >= 5 ? 296 : growth >= 4 ? 351 : growth >= 3 ? 384 : growth >= 2 ? 411 : 442;
  const height = 480 - tip;
  const renderLeaves = (layer: 'back' | 'side' | 'front') => leaves.filter(leaf => arrangement[leaf.step].layer === layer).map(leaf => {
    const placement = arrangement[leaf.step];
    const shade = layer === 'back' ? 'leaf-back' : layer === 'front' ? 'leaf-alt' : 'leaf';
    return <g key={leaf.step} transform={placement.transform}>
      <g className={`avocado-growth avocado-leaf ${growth >= leaf.step ? 'is-grown' : ''}`} style={{ transformOrigin: `250px ${placement.node}px` }}>
        <path d={leaf.stem} fill="none" stroke="#5b793f" strokeWidth="2.1" strokeLinecap="round"/>
        <path d={leaf.shape} fill={`url(#${id}-${shade})`} stroke="#385932" strokeWidth=".6"/>
        <path d={leaf.side} fill="none" stroke="#92a271" strokeWidth=".65" opacity={layer === 'back' ? .22 : .35}/>
        <path d={leaf.vein} fill="none" stroke="#a4b082" strokeWidth="1" opacity={layer === 'back' ? .4 : .6}/>
      </g>
    </g>;
  });
  return <svg className="avocado-plant" viewBox="0 70 500 510" role="img" aria-label={`Авокадо в белом горшке. Рост: ${growth} из 10.`}>
    <defs>
      <linearGradient id={`${id}-leaf`} x1="0" y1="0" x2="1" y2=".9"><stop stopColor="#52743a"/><stop offset=".45" stopColor="#345b2d"/><stop offset="1" stopColor="#244b2c"/></linearGradient>
      <linearGradient id={`${id}-leaf-alt`} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#608047"/><stop offset=".5" stopColor="#406532"/><stop offset="1" stopColor="#2c522d"/></linearGradient>
      <linearGradient id={`${id}-leaf-back`} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#46623b"/><stop offset="1" stopColor="#2a472e"/></linearGradient>
      <linearGradient id={`${id}-pot`}><stop stopColor="#e3dfd9"/><stop offset=".3" stopColor="#fffdfa"/><stop offset=".68" stopColor="#f7f5f0"/><stop offset="1" stopColor="#d8d5d0"/></linearGradient>
      <radialGradient id={`${id}-contact`}><stop stopColor="#775d59" stopOpacity=".19"/><stop offset="1" stopColor="#775d59" stopOpacity="0"/></radialGradient>
    </defs>
    <ellipse cx="251" cy="562" rx="53" ry="5" fill={`url(#${id}-contact)`}/>
    {renderLeaves('back')}
    <path d="M199 478 L211 551 Q250 568 289 551 L301 478Z" fill={`url(#${id}-pot)`} stroke="#d4cec6" strokeWidth="1"/>
    <ellipse cx="250" cy="478" rx="51" ry="12" fill="#fffdf8" stroke="#d5cfc8"/>
    <ellipse cx="250" cy="478" rx="45" ry="8" fill="#43392c"/>
    <path d="M214 477 L218 478 M269 475 L273 474 M280 480 L283 480 M235 482 L239 482" stroke="#927e5f" strokeWidth="1.4"/>
    {growth === 0 && <><path d="M241 479 Q241 462 250 459 Q262 465 261 479 Q251 485 241 479" fill="#94704c"/><path d="M250 462 L250 480" stroke="#664d35"/></>}
    <path className="avocado-trunk" d={`M250 480 C247 ${480 - height * .2} 251 ${480 - height * .4} 250 ${480 - height * .5} S253 ${tip + height * .25} 250 ${tip}`} fill="none" stroke="#56743c" strokeWidth="3.1" strokeLinecap="round" opacity={growth > 0 ? 1 : 0}/>
    {renderLeaves('side')}
    {renderLeaves('front')}
  </svg>;
}
