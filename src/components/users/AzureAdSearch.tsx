// import { useState, useRef, useCallback, useEffect } from "react";
// import { Loader2, Briefcase, Building2 } from "lucide-react";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { cn } from "@/lib/utils";
// import { apiClient, env, ApiError } from "@/lib/api";
// import type { ApiResponse, AzureAdUser } from "@/types/api";

// interface Props {
//   onSelect: (user: AzureAdUser) => void;
//   disabled?: boolean;
// }

// export function AzureAdUserSearch({ onSelect, disabled = false }: Props) {
//   const [query, setQuery]             = useState("");
//   const [results, setResults]         = useState<AzureAdUser[]>([]);
//   const [isLoading, setIsLoading]     = useState(false);
//   const [isOpen, setIsOpen]           = useState(false);
//   const [error, setError]             = useState<string | null>(null);
//   const [activeIndex, setActiveIndex] = useState(-1);
//   const [selected, setSelected]       = useState(false);

//   const containerRef = useRef<HTMLDivElement>(null);
//   const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

//   // Close dropdown when clicking outside
//   useEffect(() => {
//     function handleOutside(e: MouseEvent) {
//       if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
//         setIsOpen(false);
//       }
//     }
//     document.addEventListener("mousedown", handleOutside);
//     return () => document.removeEventListener("mousedown", handleOutside);
//   }, []);

//   const search = useCallback(async (q: string) => {
//     if (q.length < 3) {
//       setResults([]);
//       setIsOpen(false);
//       return;
//     }
//     setIsLoading(true);
//     setError(null);
//     try {
//       const response = await apiClient.get<ApiResponse<AzureAdUser[]>>(
//         env.userManagement,
//         "/api/users/azure-ad/search",
//         { q }
//       );
//       setResults(response.data || []);
//       setIsOpen(true);
//       setActiveIndex(-1);
//     } catch (err) {
//       if (err instanceof ApiError) {
//         setError(err.message || "Search failed");
//       } else {
//         setError("Search failed — please try again");
//       }
//       setResults([]);
//     } finally {
//       setIsLoading(false);
//     }
//   }, []);

//   const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const value = e.target.value;
//     setQuery(value);
//     setSelected(false);
//     if (debounceRef.current) clearTimeout(debounceRef.current);
//     debounceRef.current = setTimeout(() => search(value), 300);
//   };

//   const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
//     if (!isOpen || results.length === 0) return;
//     if (e.key === "ArrowDown") {
//       e.preventDefault();
//       setActiveIndex((i) => Math.min(i + 1, results.length - 1));
//     } else if (e.key === "ArrowUp") {
//       e.preventDefault();
//       setActiveIndex((i) => Math.max(i - 1, 0));
//     } else if (e.key === "Enter" && activeIndex >= 0) {
//       e.preventDefault();
//       handleSelect(results[activeIndex]);
//     } else if (e.key === "Escape") {
//       setIsOpen(false);
//     }
//   };

//   const handleSelect = (user: AzureAdUser) => {
//     setQuery(user.mail.trim().toLowerCase());
//     setSelected(true);
//     setIsOpen(false);
//     setResults([]);
//     onSelect(user); // parent fills name + email + entraObjectId
//   };

//   return (
//     // This div replaces the <div className="space-y-2"> wrapper of the old Email field
//     <div className="space-y-2" ref={containerRef}>
//       <Label htmlFor="email">Email *</Label>

//       <div className="relative">
//         <Input
//           id="email"
//           type="email"
//           value={query}
//           onChange={handleChange}
//           onKeyDown={handleKeyDown}
//           onFocus={() => results.length > 0 && !selected && setIsOpen(true)}
//           placeholder="john@company.com"
//           disabled={disabled}
//           autoComplete="off"
//           className={cn(selected && "border-primary/60 bg-primary/5")}
//         />

//         {/* Spinner inside the input while loading */}
//         {isLoading && (
//           <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
//             <Loader2 className="h-4 w-4 animate-spin" />
//           </div>
//         )}

//         {/* Results dropdown */}
//         {isOpen && results.length > 0 && (
//           <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
//             <ul role="listbox" className="max-h-52 overflow-y-auto py-1">
//               {results.map((user, idx) => (
//                 <li
//                   key={user.id}
//                   role="option"
//                   aria-selected={idx === activeIndex}
//                   className={cn(
//                     "flex items-start gap-3 px-3 py-2.5 cursor-pointer transition-colors",
//                     idx === activeIndex ? "bg-primary/10" : "hover:bg-muted/60"
//                   )}
//                   onMouseEnter={() => setActiveIndex(idx)}
//                   onMouseDown={(e) => {
//                     e.preventDefault(); // keep input focused until selection
//                     handleSelect(user);
//                   }}
//                 >
//                   {/* Initials avatar */}
//                   <div className="mt-0.5 flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-semibold">
//                     {user.displayName
//                       .split(" ")
//                       .slice(0, 2)
//                       .map((n) => n[0])
//                       .join("")
//                       .toUpperCase()}
//                   </div>

//                   <div className="flex-1 min-w-0">
//                     <p className="text-sm font-medium truncate">{user.displayName}</p>
//                     <p className="text-xs text-muted-foreground truncate">{user.mail}</p>
//                     {user.jobTitle && (
//                       <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
//                         <Briefcase className="h-2.5 w-2.5 flex-shrink-0" />
//                         <span>{user.jobTitle}</span>
//                       </p>
//                     )}
//                     {user.department && (
//                       <p className="text-xs text-muted-foreground/70 truncate flex items-center gap-1 mt-0.5">
//                         <Building2 className="h-2.5 w-2.5 flex-shrink-0" />
//                         <span>{user.department}</span>
//                       </p>
//                     )}
//                   </div>
//                 </li>
//               ))}
//             </ul>
//           </div>
//         )}

//         {/* No results */}
//         {isOpen && !isLoading && results.length === 0 && query.length >= 3 && (
//           <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg">
//             <p className="px-3 py-3 text-sm text-muted-foreground">
//               No Azure AD users found for &ldquo;{query}&rdquo;
//             </p>
//           </div>
//         )}
//       </div>

//       {error && <p className="text-xs text-destructive">{error}</p>}
//     </div>
//   );
// }