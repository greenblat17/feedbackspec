import Image from "next/image";
import config from "@/config";

const CTA = () => {
  return (
    <section className="relative hero overflow-hidden min-h-screen">
      <Image
        src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
        alt="Background"
        className="object-cover w-full"
        fill
      />
      <div className="relative hero-overlay bg-neutral bg-opacity-70"></div>
      <div className="relative hero-content text-center text-neutral-content p-8">
        <div className="flex flex-col items-center max-w-xl p-8 md:p-0">
          <h2 className="font-bold text-3xl md:text-5xl tracking-tight mb-8 md:mb-12">
            Stop wasting time on manual feedback management
          </h2>
          <p className="text-lg opacity-80 mb-8 md:mb-12">
            <strong>
              Your users are giving you the roadmap to $100k+ MRR every day.
            </strong>
          </p>
          <p className="text-lg opacity-80 mb-12 md:mb-16">
            The question is: are you organized enough to follow it?
          </p>

          <div className="flex flex-col gap-4 items-center">
            <button className="btn btn-primary btn-wide">
              Get {config.appName} Free
            </button>
            <div className="text-sm opacity-70">
              14 days free • No card required • Setup takes 5 minutes
            </div>
          </div>

          <div className="mt-8 text-sm opacity-70 italic">
            &quot;The best investment I made for my development workflow this
            year&quot; - Sarah K., MindfulApp ($18k MRR)
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;
