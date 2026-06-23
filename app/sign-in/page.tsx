import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-blue-900 font-medium text-2xl mb-1">◈ NodoCalc</div>
          <div className="text-gray-500 text-sm">Plataforma de cálculo para ingeniería civil</div>
        </div>
        <SignIn />
      </div>
    </div>
  )
}
