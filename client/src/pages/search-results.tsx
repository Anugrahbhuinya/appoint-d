import { useEffect, useState } from "react";
import { Link } from "wouter";
import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type SearchItem =
  | {
      type: "doctor";
      id: string;
      title: string;
      description?: string;
      specialization?: string;
      rating?: number;
    }
  | {
      type: "place";
      title: string;
      description?: string;
      lat?: string;
      lon?: string;
    };

export default function SearchResultsPage() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  // read query params
  const params = new URL(window.location.href).searchParams;
  const q = params.get("query") || "";
  const location = params.get("location") || "";

  useEffect(() => {
    let mounted = true;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/search?query=${encodeURIComponent(q)}&location=${encodeURIComponent(location)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Failed to fetch results");
        const data = await res.json();
        if (!mounted) return;
        setResults(data.results || []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || "Error fetching results");
      } finally {
        if (mounted) setLoading(false);
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [q, location]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Search results</h1>
          <Link href="/">
            <Button variant="ghost">Back</Button>
          </Link>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">
              Showing results for <strong>{q || "—"}</strong> in <strong>{location || "anywhere"}</strong>
            </div>
          </CardContent>
        </Card>

        {loading && <div className="text-center text-sm text-muted-foreground">Loading...</div>}
        {error && <div className="text-center text-sm text-red-500">{error}</div>}

        <div className="grid gap-4">
          {!loading && results.length === 0 && <div className="text-sm text-muted-foreground">No results found.</div>}
          {results.map((r: any, idx) => (
            <Card key={r.id ?? idx} className="bg-card/80">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-lg font-semibold">{r.title}</div>
                    {r.description && <div className="text-sm text-muted-foreground mt-1">{r.description}</div>}
                    {r.type === "doctor" && r.specialization && (
                      <div className="text-sm text-muted-foreground mt-2">Specialization: {r.specialization}</div>
                    )}
                  </div>
                  <div className="text-right">
                    {r.type === "doctor" && r.rating != null && (
                      <div className="text-sm font-medium text-primary">{r.rating} ★</div>
                    )}
                    {r.type === "place" && (r.lat || r.lon) && (
                      <a
                        className="text-sm text-primary hover:underline"
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          `${r.lat},${r.lon}`
                        )}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View on map
                      </a>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
