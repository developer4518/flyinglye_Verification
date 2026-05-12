import React from "react";
import Navbar from "../components/Home/Navbar";
import HeroSection from "../components/Home/HeroSection";
//import PopularDestinations from "../components/Destination/PopularDestination";
import WhyChooseUs from "./WhyChooseUs";
import TestimonialsSection from "./TestimonialsSection";
import CTASection from "../components/Home/CTASection";
import AboutUs from "../components/Home/AboutUs";
import PackageSection from "../modules/packages/PackageSection";
import BlogSection from "../components/Home/BlogSection";

const Home = () => {
  return (
    <div className="bg-(--bg-main)">
      <Navbar />
      <HeroSection />
      {/* <PopularDestinations /> */}
      <PackageSection limit={4} />
      <CTASection />
      <AboutUs />
      <BlogSection />
      <WhyChooseUs />
      <TestimonialsSection />
    </div>
  );
};

export default Home;
