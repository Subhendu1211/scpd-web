import React from "react";

export default function About() {
  return (
    <div className="about-page">
      <header className="page-header">
        <h1>About Us</h1>
        <p className="lead">
          {/* TODO: Replace with official summary (2–3 lines). */}
          {/* The Office of the State Commissioner for Persons with Disabilities
          {/* (SCPD), Odisha, ensures rights and entitlements of persons with
          disabilities through oversight, facilitation, and grievance redressal
          under the RPwD Act, 2016. */}
        </p>
      </header>

      <div className="about-grid">
        <aside className="toc" aria-label="On this page">
          <nav>
            <ul>
              <li>
                <a href="#vision">Vision</a>
              </li>
              <li>
                <a href="#mission">Mission</a>
              </li>
              <li>
                <a href="#mandate">Mandate & Functions</a>
              </li>
              <li>
                <a href="#org-structure">Organisation Structure</a>
              </li>
              <li>
                <a href="#acts">Acts, Rules & Guidelines</a>
              </li>
              <li>
                <a href="#contact">Contact</a>
              </li>
            </ul>
          </nav>
        </aside>

        <main className="about-content">
          <section id="vision" className="about-section">
            <h2>Vision</h2>
            <p>
              {/* TODO: Official vision statement (1–2 lines). */}
              An inclusive Odisha where persons with disabilities live with
              dignity, independence, and equal opportunity.
            </p>
          </section>

          <section id="mission" className="about-section">
            <h2>Mission</h2>
            <ul>
              {/* TODO: Replace bullet points with official mission. */}
              <li>
                Protect and promote the rights of persons with disabilities as
                per RPwD Act, 2016.
              </li>
              <li>
                Facilitate accessibility, awareness, and convergence across
                Departments.
              </li>
              <li>
                Ensure effective grievance redressal and compliance monitoring.
              </li>
            </ul>
          </section>

          <section id="mandate" className="about-section">
            <h2>Mandate & Functions</h2>
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th className="col-sl">Sl. No.</th>
                    <th>Function</th>
                    <th className="col-actions">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {/* TODO: Fill accurate functions as per State SCPD mandate. */}
                  <tr>
                    <td>1</td>
                    <td>
                      Monitor implementation of RPwD Act, 2016 and Rules in
                      Odisha.
                    </td>
                    <td>
                      <a href="/acts/rpwd-act">Read more</a>
                    </td>
                  </tr>
                  <tr>
                    <td>2</td>
                    <td>
                      Inquire into complaints regarding deprivation of rights or
                      discrimination.
                    </td>
                    <td>
                      <a href="/grievances/register">Register a complaint</a>
                    </td>
                  </tr>
                  <tr>
                    <td>3</td>
                    <td>
                      Recommend corrective measures to authorities and monitor
                      compliance.
                    </td>
                    <td>
                      <a href="/grievances/final-orders">View orders</a>
                    </td>
                  </tr>
                  <tr>
                    <td>4</td>
                    <td>
                      Promote accessibility in built environment, ICT,
                      transport, and services.
                    </td>
                    <td>
                      <a href="/resources/notifications-resolutions-circulars-om">
                        Notifications
                      </a>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section id="org-structure" className="about-section">
            <h2>Organisation Structure</h2>
            {/* TODO: Replace with a real org chart image */}
            <figure className="org-chart">
              <div className="org-chart-box">
                <div className="muted">Upload org chart image at:</div>
                <code>src/assets/about/org-chart.png</code>
              </div>
              <figcaption className="muted">
                Organisation chart of SCPD, Odisha
              </figcaption>
            </figure>
          </section>

          <section id="acts" className="about-section">
            <h2>Acts, Rules & Guidelines</h2>
            <ul>
              {/* Link to your existing sections/routes */}
              <li>
                <a href="/acts/disability-acts">Disability Acts</a>
              </li>
              <li>
                <a href="/acts/disability-policies">Policies</a>
              </li>
              <li>
                <a href="/acts/disability-rules-regulations">
                  Rules & Regulations
                </a>
              </li>
              <li>
                <a href="/acts/disability-guidelines">Guidelines</a>
              </li>
              <li>
                <a href="/acts/equal-opportunity-policy">Equal Opportunity Policy</a>
              </li>
            </ul>
          </section>

          <section id="contact" className="about-section">
            <h2>Contact</h2>
            <address className="address-block">
              {/* Kept consistent with your Contact page */}
              A1 Block, Ground Floor, Toshali Bhawan, Satyanagar, Bhubaneswar,
              Odisha, India
            </address>
            <p>
              <a href="/contact">More contact details</a>
            </p>
          </section>
        </main>
      </div>
    </div>
  );
}
