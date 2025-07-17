"use client";

import { useRef, useState } from "react";

// <FAQ> component is a lsit of <Item> component
// Just import the FAQ & add your FAQ content to the const faqList

const faqList = [
  {
    question:
      "How does FeedbackSpec collect feedback from different platforms?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          FeedbackSpec integrates with popular platforms through APIs and
          webhooks. Once you connect your accounts (Twitter, Discord, email,
          Reddit, Intercom, etc.), our system automatically monitors mentions,
          comments, and messages related to your product.
        </p>
        <p>
          Setup takes just a few minutes with one-click integrations for most
          platforms.
        </p>
      </div>
    ),
  },
  {
    question: "What AI coding assistants does FeedbackSpec work with?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>FeedbackSpec generates specifications optimized for:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Cursor</li>
          <li>Claude Code</li>
          <li>GitHub Copilot</li>
          <li>Any AI coding assistant that accepts detailed prompts</li>
        </ul>
        <p>
          The specs include context, requirements, and implementation details
          formatted for AI assistants.
        </p>
      </div>
    ),
  },
  {
    question: "How accurate is the AI categorization and prioritization?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>
          Our AI achieves 90%+ accuracy in categorizing feedback as bugs,
          feature requests, or improvements. The prioritization algorithm
          considers:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>User subscription level and MRR contribution</li>
          <li>Frequency of similar requests</li>
          <li>Implementation complexity estimates</li>
          <li>Business impact scoring</li>
        </ul>
        <p>You can always manually adjust priorities if needed.</p>
      </div>
    ),
  },
  {
    question: "Can I customize the specification templates?",
    answer: (
      <p>
        Yes! Pro plan users can create custom specification templates that match
        their development workflow. You can define your preferred format,
        include specific sections, and even add your coding standards or style
        preferences.
      </p>
    ),
  },
  {
    question: "What happens to my data? Is it secure?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>Your data security is our top priority:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>All data is encrypted in transit and at rest</li>
          <li>We follow SOC 2 Type II compliance standards</li>
          <li>No AI training on your private data</li>
          <li>You own your data and can export it anytime</li>
        </ul>
        <p>
          We only access the minimum data needed to categorize and prioritize
          feedback.
        </p>
      </div>
    ),
  },
  {
    question: "Can I get a refund if I'm not satisfied?",
    answer: (
      <p>
        Absolutely! We offer a 14-day free trial, and even after you start
        paying, you can request a full refund within 30 days if you&apos;re not
        completely satisfied. Just reach out to our support team.
      </p>
    ),
  },
  {
    question: "How much time does FeedbackSpec actually save?",
    answer: (
      <div className="space-y-2 leading-relaxed">
        <p>Our users report saving 10-15 hours per month on average:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>No more manual checking of 5-7 different platforms</li>
          <li>Automated categorization saves 2-3 hours weekly</li>
          <li>Instant spec generation saves 1-2 hours per feature</li>
          <li>Prioritization insights prevent building wrong features</li>
        </ul>
        <p>
          Most users recoup the subscription cost in time savings within the
          first week.
        </p>
      </div>
    ),
  },
];

const Item = ({ item }) => {
  const accordion = useRef(null);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <li>
      <button
        className="relative flex gap-2 items-center w-full py-5 text-base font-semibold text-left border-t md:text-lg border-base-content/10"
        onClick={(e) => {
          e.preventDefault();
          setIsOpen(!isOpen);
        }}
        aria-expanded={isOpen}
      >
        <span
          className={`flex-1 text-base-content ${isOpen ? "text-primary" : ""}`}
        >
          {item?.question}
        </span>
        <svg
          className={`flex-shrink-0 w-4 h-4 ml-auto fill-current`}
          viewBox="0 0 16 16"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center transition duration-200 ease-out ${
              isOpen && "rotate-180"
            }`}
          />
          <rect
            y="7"
            width="16"
            height="2"
            rx="1"
            className={`transform origin-center rotate-90 transition duration-200 ease-out ${
              isOpen && "rotate-180 hidden"
            }`}
          />
        </svg>
      </button>

      <div
        ref={accordion}
        className={`transition-all duration-300 ease-in-out opacity-80 overflow-hidden`}
        style={
          isOpen
            ? { maxHeight: accordion?.current?.scrollHeight, opacity: 1 }
            : { maxHeight: 0, opacity: 0 }
        }
      >
        <div className="pb-5 leading-relaxed">{item?.answer}</div>
      </div>
    </li>
  );
};

const FAQ = () => {
  return (
    <section className="bg-base-200" id="faq">
      <div className="py-24 px-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-12">
        <div className="flex flex-col text-left basis-1/2">
          <p className="inline-block font-semibold text-primary mb-4">FAQ</p>
          <p className="sm:text-4xl text-3xl font-extrabold text-base-content">
            Frequently Asked Questions
          </p>
        </div>

        <ul className="basis-1/2">
          {faqList.map((item, i) => (
            <Item key={i} item={item} />
          ))}
        </ul>
      </div>
    </section>
  );
};

export default FAQ;
