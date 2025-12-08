/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import { useHistory } from '@/features/resume/hooks/useHistory';

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useHistory('guest', 50);

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Analysis History</h1>
        <button className="bg-blue-600 text-white px-3 py-1 rounded" onClick={() => refetch()}>Refresh</button>
      </div>

      {isLoading && <p>Loading...</p>}
      {error && <p className="text-red-600">{(error as any).message}</p>}

      {data && data.length === 0 && <p>No analyses found.</p>}

      {data && data.length > 0 && (
        <ul className="space-y-4">
          {data.map((item) => (
            <li key={item.id} className="border rounded p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p><b>File:</b> {item.fileName}</p>
                  <p className="text-sm text-gray-600"><b>Date:</b> {new Date(item.createdAt).toLocaleString()}</p>
                </div>
                <a
                  href={`/recommendations?pageId=${item.id}`}
                  className="bg-green-600 text-white px-3 py-1 rounded"
                >
                  View Recommendations
                </a>
              </div>

              <details className="mt-3">
                <summary className="cursor-pointer">Details</summary>
                <pre className="bg-gray-100 p-3 rounded overflow-auto text-xs">{JSON.stringify(item.result, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}