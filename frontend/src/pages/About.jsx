import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

const storyImage =
  "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1400&q=85";

export default function About() {
  return (
    <div className="aboutPage">
      <section className="publicPageHero">
        <span className="eyebrow">OUR STORY · AMIR JEWELLERS</span>
        <h1>The story of<br /><em>Amir Jewellers.</em></h1>
        <p>Rooted in the timeless beauty of gold, AMIR JEWELLERS celebrates meaningful moments through elegant jewellery and transparent pricing.</p>
      </section>
      <section className="aboutEditorial section">
        <div className="aboutEditorialImage">
          <img src={storyImage} alt="Gold jewellery presented in warm, considered light" loading="lazy" decoding="async" />
        </div>
        <div className="aboutEditorialCopy">
          <span className="eyebrow">MORE THAN ORNAMENT</span>
          <h2>Gold carries<br /><em>your story.</em></h2>
          <p>Every piece represents more than precious metal. It reflects craftsmanship, meaningful moments, and a tradition of timeless elegance.</p>
          <p>We invite you to explore the collection and speak with our team about the pieces that matter to you.</p>
          <Link className="btn gold" to="/collection">Explore the collection <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  );
}
