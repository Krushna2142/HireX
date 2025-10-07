export default function ResumeUpload() {
  return (
    <div className="max-w-lg mx-auto">
      <h2 className="text-2xl font-bold mb-4">Upload Resume</h2>
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        className="border w-full p-2 rounded"
      />
      <button className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
        Analyze
      </button>
    </div>
  );
}
