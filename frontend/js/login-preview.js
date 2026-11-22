
const demoSlides = [
    {
        title: "Monthly Sales",
        period: "Jan - Aug",
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        values: [35, 55, 42, 75, 60, 90, 70, 100]
    },
    {
        title: "Revenue Growth",
        period: "8 Month Overview",
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        values: [25, 40, 35, 60, 55, 75, 85, 100]
    },
    {
        title: "Inventory Movement",
        period: "Stock Overview",
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"],
        values: [80, 65, 90, 50, 75, 45, 65, 85]
    }
];

let currentSlide = 0;

function showDemoSlide() {
    const slide = demoSlides[currentSlide];

    document.getElementById("demoChartTitle").textContent = slide.title;
    document.getElementById("demoChartPeriod").textContent = slide.period;

    const bars = document.getElementById("demoChartBars");
    const labels = document.getElementById("demoChartLabels");

    bars.innerHTML = slide.values
        .map(value => `<i style="height:${value}%"></i>`)
        .join("");

    labels.innerHTML = slide.labels
        .map(label => `<span>${label}</span>`)
        .join("");

    currentSlide = (currentSlide + 1) % demoSlides.length;
}

showDemoSlide();

setInterval(showDemoSlide, 3000);
