import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h1>404 </h1>
      <div> Page not found</div>
      <div>
        Do you want me to create this page? If yes, feel free to contact me
      </div>
      <Link href="/">Go back to Homepage</Link>
    </div>
  );
}
