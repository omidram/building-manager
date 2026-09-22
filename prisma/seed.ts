import { PrismaClient, Role, ChargeStatus, TicketStatus, VoteStatus } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await prisma.paymentReceipt.deleteMany();
  await prisma.walletTransaction.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.chatMessage.deleteMany();
  await prisma.ticketReply.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.voteBallot.deleteMany();
  await prisma.pollOption.deleteMany();
  await prisma.poll.deleteMany();
  await prisma.charge.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.cleaningTask.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.buildingRule.deleteMany();
  await prisma.buildingSettings.deleteMany();
  await prisma.user.deleteMany();

  const password = await bcrypt.hash("123456", 10);

  const manager = await prisma.user.create({
    data: {
      email: "manager@hamsaye.local",
      password,
      name: "سارا مدیریت",
      phone: "09120000001",
      unit: "دفتر مدیریت",
      role: Role.MANAGER,
      avatarHue: 168,
    },
  });

  const residents = await Promise.all(
    [
      { name: "علی رضایی", unit: "واحد ۱۰۱", email: "ali@hamsaye.local", hue: 12 },
      { name: "مریم احمدی", unit: "واحد ۱۰۲", email: "maryam@hamsaye.local", hue: 200 },
      { name: "حسین کریمی", unit: "واحد ۲۰۱", email: "hossein@hamsaye.local", hue: 45 },
      { name: "زهرا محمدی", unit: "واحد ۲۰۲", email: "zahra@hamsaye.local", hue: 320 },
      { name: "رضا نوری", unit: "واحد ۳۰۱", email: "reza@hamsaye.local", hue: 90 },
      { name: "نرگس صادقی", unit: "واحد ۳۰۲", email: "narges@hamsaye.local", hue: 260 },
    ].map((r) =>
      prisma.user.create({
        data: {
          email: r.email,
          password,
          name: r.name,
          phone: "0912" + Math.floor(1000000 + Math.random() * 8999999),
          unit: r.unit,
          role: Role.RESIDENT,
          avatarHue: r.hue,
        },
      }),
    ),
  );

  const ali = residents[0];

  await prisma.buildingSettings.create({
    data: {
      id: "default",
      bankName: "بانک ملت",
      accountHolder: "سارا مدیریت — صندوق ساختمان آروند",
      bankCardNumber: "6104337812345678",
      bankAccountNumber: "1234567890",
      shebaNumber: "IR120170000000123456789001",
      paymentNote: "لطفاً در توضیحات انتقال، شماره واحد خود را بنویسید و رسید را در پنل شارژ آپلود کنید.",
    },
  });

  const month = "۱۴۰۴/۰۶";
  const expenses = [
    { title: "قبض برق مشاعات", amount: 4_200_000, category: "انرژی", month, description: "آسانسور و روشنایی" },
    { title: "حقوق سرایدار", amount: 12_000_000, category: "پرسنل", month },
    { title: "مواد شوینده", amount: 850_000, category: "نظافت", month },
    { title: "تعمیر پمپ آب", amount: 3_500_000, category: "تعمیرات", month, description: "تعویض قطعه پمپ طبقه همکف" },
    { title: "بیمه ساختمان", amount: 6_000_000, category: "بیمه", month },
  ];
  await prisma.expense.createMany({ data: expenses });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const perUnit = Math.ceil(totalExpenses / residents.length / 1000) * 1000;
  const breakdownJson = JSON.stringify(
    expenses.map((e) => ({
      title: e.title,
      amount: e.amount,
      category: e.category,
      share: Math.round(e.amount / residents.length),
    })),
  );

  await prisma.charge.createMany({
    data: residents.map((r, i) => ({
      userId: r.id,
      month,
      amount: perUnit,
      status: i === 0 ? ChargeStatus.PENDING : i < 3 ? ChargeStatus.PAID : ChargeStatus.PENDING,
      paidAmount: i > 0 && i < 3 ? perUnit : 0,
      paidAt: i > 0 && i < 3 ? new Date() : null,
      breakdownJson,
      note: `سهم واحد از جمع هزینه‌های ${month}`,
    })),
  });

  await prisma.announcement.createMany({
    data: [
      {
        title: `اعلان شارژ ماه ${month}`,
        body: `شارژ ماهانه هر واحد ${perUnit.toLocaleString("fa-IR")} تومان اعلام شد.\nجمع هزینه‌های مشاعات: ${totalExpenses.toLocaleString("fa-IR")} تومان.\nجزئیات ریز هزینه‌ها و شماره کارت در بخش «شارژ ماهانه» قابل مشاهده است. پس از کارت‌به‌کارت، عکس رسید را آپلود کنید.`,
        important: true,
        authorId: manager.id,
      },
      {
        title: "جلسه مجمع عمومی ساختمان",
        body: "روز پنج‌شنبه ساعت ۱۸ در لابی ساختمان جلسه مجمع عمومی برگزار می‌شود. حضور همه مالکین ضروری است.",
        important: true,
        authorId: manager.id,
      },
      {
        title: "قطع آب برای تعمیرات",
        body: "فردا از ساعت ۹ تا ۱۲ به دلیل تعمیر پمپ، آب ساختمان قطع خواهد بود.",
        important: true,
        authorId: manager.id,
      },
    ],
  });

  await prisma.buildingRule.createMany({
    data: [
      {
        title: "ساعات سکوت",
        body: "از ساعت ۲۳ تا ۷ صبح رعایت سکوت کامل الزامی است. استفاده از ابزارهای پرصدا در این بازه ممنوع است.",
        category: "آرامش",
        order: 1,
      },
      {
        title: "پارکینگ و مهمان",
        body: "هر واحد یک جای پارک اختصاصی دارد. پارک مهمان فقط در فضای مشخص‌شده مجاز است.",
        category: "پارکینگ",
        order: 2,
      },
      {
        title: "حیوانات خانگی",
        body: "نگهداری حیوانات خانگی با هماهنگی مدیریت و رعایت نظافت مشاعات مجاز است.",
        category: "عمومی",
        order: 3,
      },
      {
        title: "زباله و بازیافت",
        body: "زباله باید در کیسه دربسته در محل تعیین‌شده قرار گیرد. تفکیک بازیافت تشویق می‌شود.",
        category: "نظافت",
        order: 4,
      },
    ],
  });

  const poll = await prisma.poll.create({
    data: {
      title: "نصب دوربین مداربسته در لابی",
      description: "آیا با نصب سیستم دوربین مداربسته در ورودی و لابی موافق هستید؟ هزینه از صندوق ساختمان تأمین می‌شود.",
      status: VoteStatus.ACTIVE,
      endsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      options: {
        create: [{ label: "موافقم" }, { label: "مخالفم" }, { label: "نیاز به بررسی بیشتر" }],
      },
    },
    include: { options: true },
  });

  await prisma.voteBallot.create({
    data: {
      pollId: poll.id,
      optionId: poll.options[0].id,
      userId: residents[1].id,
    },
  });

  await prisma.cleaningTask.createMany({
    data: [
      { title: "نظافت لابی", area: "لابی", dayOfWeek: "شنبه", completed: true, assigneeId: manager.id },
      { title: "شیشه‌شویی ورودی", area: "ورودی", dayOfWeek: "دوشنبه", completed: false, assigneeId: manager.id },
      { title: "نظافت راه‌پله شرقی", area: "راه‌پله A", dayOfWeek: "سه‌شنبه", completed: false },
      { title: "نظافت راه‌پله غربی", area: "راه‌پله B", dayOfWeek: "چهارشنبه", completed: false },
      { title: "ضدعفونی آسانسور", area: "آسانسور", dayOfWeek: "پنج‌شنبه", completed: true },
      { title: "جمع‌آوری زباله بازیافت", area: "حیاط", dayOfWeek: "جمعه", completed: false },
    ],
  });

  const ticket = await prisma.ticket.create({
    data: {
      title: "چراغ راه‌پله طبقه ۲ سوخته",
      body: "از دو روز پیش چراغ راه‌پله طبقه دوم کار نمی‌کند. لطفاً بررسی شود.",
      status: TicketStatus.IN_PROGRESS,
      authorId: ali.id,
      replies: {
        create: [{ authorId: manager.id, body: "سلام، گزارش ثبت شد. فردا تکنسین مراجعه می‌کند." }],
      },
    },
  });

  await prisma.ticket.create({
    data: {
      title: "درخواست کلید یدک انباری",
      body: "کلید انباری واحد ۱۰۱ گم شده. امکان ساخت کلید یدک هست؟",
      status: TicketStatus.OPEN,
      authorId: ali.id,
    },
  });

  await prisma.chatMessage.createMany({
    data: [
      {
        authorId: manager.id,
        body: "سلام به همه همسایه‌ها 👋 به گفتگوی همگانی ساختمان خوش آمدید.",
      },
      {
        authorId: ali.id,
        body: "سلام، ممنون. اینجا بهتر از گروه واتساپ است!",
      },
      {
        authorId: residents[1].id,
        body: "ساعت جلسه پنج‌شنبه را یادآوری می‌کنید؟",
      },
      {
        authorId: manager.id,
        body: "بله، پنج‌شنبه ساعت ۱۸ در لابی. جزئیات در بخش اعلانات هم هست.",
      },
    ],
  });

  console.log("Seed OK");
  console.log("Manager:", manager.email, "/ 123456");
  console.log("Resident:", ali.email, "/ 123456");
  console.log("Charge per unit:", perUnit);
  console.log("Ticket sample:", ticket.id);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
