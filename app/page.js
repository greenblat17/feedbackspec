import Hero from "@/components/Hero";
import Problem from "@/components/Problem";
import Testimonials3 from "@/components/Testimonials3";
import Pricing from "@/components/Pricing";
import FAQ from "@/components/FAQ";
import CTA from "@/components/CTA";
import Header from "@/components/Header";

// Benefits/Features section component
const Benefits = () => {
  const benefits = [
    {
      emoji: "🚀",
      title: "Turn any feedback into a ready feature in 5 minutes",
      description:
        "No more hours spent writing specifications. Our AI automatically generates ready-to-use prompts for Cursor and Claude Code directly from user feedback.",
      stat: "10x faster",
      highlight: "Save 15 hours/month",
    },
    {
      emoji: "📊",
      title: "Know which features to build first",
      description:
        "Automatic prioritization by user impact and MRR contribution. The system shows which requests will bring maximum ROI to your business.",
      stat: "3x ROI",
      highlight: "Data-driven decisions",
    },
    {
      emoji: "⚡",
      title: "Never miss an important insight",
      description:
        "Centralized feedback collection from all sources in one place. Never miss a valuable user suggestion again.",
      stat: "100% coverage",
      highlight: "All channels monitored",
    },
  ];

  return (
    <section className="bg-base-100 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="font-bold text-3xl lg:text-5xl tracking-tight mb-4">
            From Scattered Feedback to Shipped Features
          </h2>
          <p className="text-lg opacity-80 max-w-2xl mx-auto">
            Stop wasting time on manual feedback management and start shipping
            features your users actually want
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {benefits.map((benefit, i) => (
            <div
              key={i}
              className="relative flex flex-col items-center text-center p-8 bg-base-200 rounded-2xl hover:shadow-lg transition-all duration-300 group"
            >
              {/* Highlight Badge */}
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-content text-xs font-bold px-3 py-1 rounded-full">
                {benefit.highlight}
              </div>

              <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">
                {benefit.emoji}
              </div>

              <h3 className="font-bold text-xl mb-4">{benefit.title}</h3>

              <p className="text-base-content/80 leading-relaxed mb-6 flex-grow">
                {benefit.description}
              </p>

              {/* Stat Badge */}
              <div className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-full text-sm">
                {benefit.stat}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl p-8 max-w-lg mx-auto">
            <h3 className="text-xl font-bold mb-4">
              Ready to reclaim your development time?
            </h3>
            <button className="btn btn-primary btn-lg mb-3">
              Start Your Free Trial
            </button>
            <p className="text-sm text-base-content/60">
              14 days free • No credit card required • Setup in 5 minutes
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Product description section
const ProductDescription = () => {
  const steps = [
    {
      number: "1",
      title: "Connect sources",
      description:
        "Integrate with Twitter, Discord, email, Reddit, Intercom, app reviews with one click",
    },
    {
      number: "2",
      title: "Automatic collection",
      description:
        "System monitors all your channels 24/7 and collects mentions and feedback",
    },
    {
      number: "3",
      title: "AI categorization",
      description:
        "Automatically sorts feedback by type: bugs, features, improvements",
    },
    {
      number: "4",
      title: "Smart prioritization",
      description: "Ranks requests by user impact and potential MRR",
    },
    {
      number: "5",
      title: "Spec generation",
      description:
        "Creates ready-to-use prompts for Cursor, Claude Code, GitHub Copilot",
    },
    {
      number: "6",
      title: "Export to AI tools",
      description:
        "Copy specifications with one click directly into your coding assistant",
    },
  ];

  return (
    <section className="bg-base-200 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="font-bold text-3xl lg:text-5xl tracking-tight mb-4">
            What Is FeedbackSpec?
          </h2>
          <p className="text-lg opacity-80 max-w-3xl mx-auto">
            A SaaS platform that automatically converts user feedback into
            ready-to-use specifications for AI coding assistants.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div
              key={i}
              className="flex flex-col items-center text-center p-6 bg-base-100 rounded-2xl"
            >
              <div className="w-12 h-12 bg-primary text-primary-content rounded-full flex items-center justify-center font-bold text-xl mb-4">
                {step.number}
              </div>
              <h3 className="font-bold text-xl mb-3">{step.title}</h3>
              <p className="text-base-content/80 leading-relaxed">
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-xl font-semibold text-primary">
            Result: Instead of 15 hours of manual work per month - 30 minutes
            daily to select and implement the best ideas.
          </p>
        </div>
      </div>
    </section>
  );
};

// Detailed Features section
const Features = () => {
  const integrations = [
    {
      name: "Twitter",
      icon: "🐦",
      description: "Monitor mentions, replies, and DMs",
    },
    {
      name: "Discord",
      icon: "💬",
      description: "Track messages in your server channels",
    },
    {
      name: "Email",
      icon: "📧",
      description: "Parse support emails and feedback",
    },
    { name: "Reddit", icon: "🤖", description: "Capture comments and posts" },
    {
      name: "Intercom",
      icon: "💬",
      description: "Sync customer conversations",
    },
    {
      name: "App Reviews",
      icon: "⭐",
      description: "Monitor App Store and Play Store reviews",
    },
    { name: "GitHub", icon: "🐙", description: "Track issues and discussions" },
    {
      name: "Slack",
      icon: "💬",
      description: "Capture team and customer feedback",
    },
  ];

  const aiTools = [
    {
      name: "Cursor",
      icon: "⚡",
      description: "Optimized prompts for Cursor AI",
    },
    {
      name: "Claude Code",
      icon: "🤖",
      description: "Ready-to-use Claude specifications",
    },
    {
      name: "GitHub Copilot",
      icon: "🐙",
      description: "Compatible with Copilot workflows",
    },
    {
      name: "Custom AI",
      icon: "🛠️",
      description: "Works with any AI coding assistant",
    },
  ];

  const features = [
    {
      title: "Smart Categorization",
      description:
        "AI automatically sorts feedback into bugs, features, and improvements",
      icon: "🧠",
    },
    {
      title: "MRR-Based Prioritization",
      description:
        "Prioritize requests based on customer value and revenue impact",
      icon: "💰",
    },
    {
      title: "Sentiment Analysis",
      description: "Understand user emotions and urgency levels",
      icon: "😊",
    },
    {
      title: "Duplicate Detection",
      description:
        "Merge similar requests to avoid building the same thing twice",
      icon: "🔍",
    },
    {
      title: "Custom Templates",
      description: "Create specification templates that match your workflow",
      icon: "📝",
    },
    {
      title: "Real-time Sync",
      description: "Get feedback instantly as it happens across all platforms",
      icon: "⚡",
    },
  ];

  return (
    <section className="bg-base-100 py-24">
      <div className="max-w-7xl mx-auto px-8">
        <div className="text-center mb-16">
          <h2 className="font-bold text-3xl lg:text-5xl tracking-tight mb-4">
            Complete Integration Ecosystem
          </h2>
          <p className="text-lg opacity-80 max-w-3xl mx-auto">
            Connect all your feedback sources and AI tools in one unified
            platform
          </p>
        </div>

        {/* Integrations Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            Feedback Sources
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {integrations.map((integration, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 bg-base-200 rounded-xl hover:bg-base-300 transition-colors"
              >
                <div className="text-4xl mb-3">{integration.icon}</div>
                <h4 className="font-semibold mb-2">{integration.name}</h4>
                <p className="text-sm text-base-content/70">
                  {integration.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* AI Tools Grid */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-center mb-8">
            AI Coding Assistant Support
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {aiTools.map((tool, i) => (
              <div
                key={i}
                className="flex flex-col items-center text-center p-6 bg-base-200 rounded-xl hover:bg-base-300 transition-colors"
              >
                <div className="text-4xl mb-3">{tool.icon}</div>
                <h4 className="font-semibold mb-2">{tool.name}</h4>
                <p className="text-sm text-base-content/70">
                  {tool.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Features Grid */}
        <div className="mb-12">
          <h3 className="text-2xl font-bold text-center mb-8">
            Powerful Features
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div
                key={i}
                className="flex items-start p-6 bg-base-200 rounded-xl"
              >
                <div className="text-3xl mr-4">{feature.icon}</div>
                <div>
                  <h4 className="font-semibold mb-2">{feature.title}</h4>
                  <p className="text-base-content/70">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <div className="bg-primary/10 rounded-2xl p-8 max-w-2xl mx-auto">
            <h3 className="text-2xl font-bold mb-4">
              Ready to 10x Your Development Speed?
            </h3>
            <p className="text-base-content/80 mb-6">
              Join 200+ indie hackers who&apos;ve automated their feedback
              workflow
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="btn btn-primary btn-lg">
                Start Free Trial
              </button>
              <button className="btn btn-outline btn-lg">See Demo</button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

// Social proof section
const SocialProof = () => {
  const metrics = [
    { value: "200+", label: "Happy Customers", icon: "👥" },
    { value: "15hrs", label: "Average Time Saved/Month", icon: "⏰" },
    { value: "98%", label: "Customer Satisfaction", icon: "💝" },
    { value: "10k+", label: "Features Shipped", icon: "🚀" },
  ];

  const customers = [
    { name: "TaskFlow", logo: "🎯", industry: "Productivity SaaS" },
    { name: "StudyBuddy", logo: "📚", industry: "EdTech" },
    { name: "CodeReviewer", logo: "💻", industry: "Developer Tools" },
    { name: "MindfulApp", logo: "🧘", industry: "Wellness" },
    { name: "DataSync", logo: "📊", industry: "Analytics" },
    { name: "ChatBot Pro", logo: "🤖", industry: "AI Tools" },
  ];

  return (
    <section className="bg-base-200 py-16">
      <div className="max-w-7xl mx-auto px-8">
        {/* Metrics */}
        <div className="text-center mb-16">
          <h2 className="font-bold text-2xl lg:text-3xl tracking-tight mb-8">
            Trusted by 200+ Indie Hackers
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {metrics.map((metric, i) => (
              <div key={i} className="flex flex-col items-center">
                <div className="text-4xl mb-2">{metric.icon}</div>
                <div className="text-3xl font-bold text-primary mb-1">
                  {metric.value}
                </div>
                <div className="text-sm text-base-content/70">
                  {metric.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Logos */}
        <div className="text-center">
          <p className="text-lg font-semibold mb-8 text-base-content/80">
            Join successful indie hackers who ship faster with FeedbackSpec
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {customers.map((customer, i) => (
              <div
                key={i}
                className="flex flex-col items-center p-4 bg-base-100 rounded-lg hover:shadow-lg transition-shadow"
              >
                <div className="text-3xl mb-2">{customer.logo}</div>
                <div className="font-semibold text-sm mb-1">
                  {customer.name}
                </div>
                <div className="text-xs text-base-content/60">
                  {customer.industry}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default function Page() {
  return (
    <>
      <Header />
      <Hero />
      <Problem />
      <Benefits />
      <ProductDescription />
      <Features />
      <SocialProof />
      <Testimonials3 />
      <Pricing />
      <FAQ />
      <CTA />
    </>
  );
}
