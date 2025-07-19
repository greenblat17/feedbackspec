import Image from "next/image";
import TestimonialsAvatars from "./TestimonialsAvatars";
import config from "../config.js";

const Hero = () => {
  return (
    <section className="max-w-7xl mx-auto bg-base-100 flex flex-col lg:flex-row items-center justify-center gap-16 lg:gap-20 px-8 py-8 lg:py-20">
      <div className="flex flex-col gap-10 lg:gap-14 items-center justify-center text-center lg:text-left lg:items-start">
        <h1 className="font-extrabold text-4xl lg:text-6xl tracking-tight md:-mb-4">
          Turn scattered feedback into Cursor and Claude Code specs in minutes,
          not hours
        </h1>
        <p className="text-lg opacity-80 leading-relaxed">
          The automated platform for indie hackers and solo founders that
          collects feedback from all sources and generates AI-ready
          specifications for instant feature development.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <button className="btn btn-primary btn-wide">
            Try free for 14 days
          </button>
          <div className="text-sm opacity-60 text-center sm:text-left">
            No card required • Instant setup
          </div>
        </div>

        <TestimonialsAvatars priority={true} />
      </div>
      <div className="lg:w-full">
        <Image
          src="https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80"
          alt="FeedbackSpec Dashboard"
          className="w-full rounded-2xl shadow-xl"
          priority={true}
          width={500}
          height={500}
        />
      </div>
    </section>
  );
};

export default Hero;
